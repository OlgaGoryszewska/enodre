"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fromHeader, getMailer } from "@/lib/mailer";
import { addBusinessDays, FOLLOW_UP_BUSINESS_DAYS, osloToday } from "@/lib/gtm-logic";
import { isMissingColumnError, updateLead } from "@/lib/lead-updates";
import { CLOSED_STATUSES, type PotentialCustomer, type PotentialCustomerStatus } from "@/lib/potential-customer";
import {
  MESSAGE_CHANNEL_VALUES,
  MESSAGE_KIND_VALUES,
  MESSAGE_LANGUAGE_VALUES,
  verifiedFacts,
  type LeadMessage,
} from "@/lib/outreach-templates";
import { checkMessage, isReady, type QualityIssue } from "@/lib/message-quality";
import type { ResponseType } from "@/lib/industry-playbooks";

const sentMessageSchema = z.object({
  leadId: z.uuid(),
  kind: z.enum(MESSAGE_KIND_VALUES),
  channel: z.enum(MESSAGE_CHANNEL_VALUES),
  language: z.enum(MESSAGE_LANGUAGE_VALUES),
  subject: z
    .string()
    .trim()
    .max(300)
    .transform((value) => value || null)
    .nullable(),
  body: z.string().trim().min(1, "The message is empty.").max(5000),
  // Set when logging an email that was already sent (e.g. its first log failed).
  recipient: z.string().trim().pipe(z.email()).nullable().optional(),
});

export type SentMessageInput = z.input<typeof sentMessageSchema>;
export type DraftInput = Omit<SentMessageInput, "recipient">;

// Replies to outreach go to the shared inbox, not the sending Gmail account.
const REPLY_TO = "info@enodre.com";

// The follow-up sequence: first contact → follow-up (4 business days) →
// final follow-up (5 more) → done. A reply, a decline or "do not contact" stops it.
const FINAL_FOLLOW_UP_BUSINESS_DAYS = 5;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function refresh() {
  revalidatePath("/admin/marketing", "layout");
  revalidatePath("/admin/execution");
}

async function loadLead(supabase: SupabaseClient, leadId: string) {
  // "*" rather than a column list: newer columns may not exist yet.
  const { data, error } = await supabase.from("potential_customers").select("*").eq("id", leadId).single();
  if (error) throw error;
  return data as PotentialCustomer;
}

/** The quality check, run on the server too — the browser's verdict isn't trusted. */
function qualityFor(lead: PotentialCustomer, values: { kind: string; language: "no" | "en"; body: string }) {
  return checkMessage({
    kind: values.kind,
    language: values.language,
    body: values.body,
    companyName: lead.company || lead.name,
    verifiedFacts: verifiedFacts(lead).map((fact) => fact.fact),
  });
}

/** The open (draft or approved) message for a lead and type, if any. */
async function openDraft(supabase: SupabaseClient, leadId: string, kind: string) {
  const { data, error } = await supabase
    .from("lead_messages")
    .select("*")
    .eq("lead_id", leadId)
    .eq("kind", kind)
    .in("status", ["draft", "approved"])
    .maybeSingle();
  if (error) {
    // No status column yet (outreach_system.sql not run): no drafts exist.
    if (isMissingColumnError(error)) return { draft: null, supported: false };
    throw error;
  }
  return { draft: data as LeadMessage | null, supported: true };
}

async function saveOpen(
  supabase: SupabaseClient,
  values: z.output<typeof sentMessageSchema>,
  status: "draft" | "approved",
  quality: QualityIssue[]
) {
  const { draft, supported } = await openDraft(supabase, values.leadId, values.kind);
  if (!supported) throw new Error("Drafts need outreach_system.sql — run it in the Supabase SQL Editor.");
  const row = {
    lead_id: values.leadId,
    kind: values.kind,
    channel: values.channel,
    language: values.language,
    subject: values.subject,
    body: values.body,
    status,
    quality,
    approved_at: status === "approved" ? new Date().toISOString() : null,
  };
  const query = draft
    ? supabase.from("lead_messages").update(row).eq("id", draft.id)
    : supabase.from("lead_messages").insert(row);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data as LeadMessage;
}

/** Saves the message as a draft (one open draft per lead and message type). */
export async function saveMessageDraft(input: DraftInput): Promise<LeadMessage> {
  const values = sentMessageSchema.parse(input);
  const supabase = await createClient();
  const lead = await loadLead(supabase, values.leadId);
  const saved = await saveOpen(supabase, values, "draft", qualityFor(lead, values));
  refresh();
  return saved;
}

/**
 * Approves the message for sending. Refused while the quality check has
 * errors, or when the lead asked not to be contacted.
 */
export async function approveMessage(input: DraftInput): Promise<LeadMessage> {
  const values = sentMessageSchema.parse(input);
  const supabase = await createClient();
  const lead = await loadLead(supabase, values.leadId);
  if (lead.do_not_contact) throw new Error("This lead asked not to be contacted.");
  const quality = qualityFor(lead, values);
  if (!isReady(quality)) {
    throw new Error(
      `Fix first: ${quality
        .filter((issue) => issue.level === "error")
        .map((issue) => issue.title)
        .join("; ")}`
    );
  }
  const saved = await saveOpen(supabase, values, "approved", quality);
  refresh();
  return saved;
}

/**
 * Only the approved text can go out: the approved draft must exist and match
 * what's being sent. (Before outreach_system.sql there are no drafts; then the
 * quality check alone gates sending, as before.)
 */
async function requireApproved(
  supabase: SupabaseClient,
  lead: PotentialCustomer,
  values: z.output<typeof sentMessageSchema>
) {
  const { draft, supported } = await openDraft(supabase, values.leadId, values.kind);
  if (!supported) {
    if (!isReady(qualityFor(lead, values))) throw new Error("The message isn't ready — check the warnings.");
    return null;
  }
  if (!draft || draft.status !== "approved") throw new Error("Approve the message before sending it.");
  if (draft.body.trim() !== values.body.trim() || (draft.subject ?? "") !== (values.subject ?? "")) {
    throw new Error("The message changed after you approved it — approve it again.");
  }
  return draft;
}

/** Logs a message you sent yourself (LinkedIn, phone, your own email). */
export async function markLeadMessageSent(input: SentMessageInput): Promise<LeadMessage> {
  const values = sentMessageSchema.parse(input);
  const supabase = await createClient();
  const lead = await loadLead(supabase, values.leadId);
  const approved = await requireApproved(supabase, lead, values);
  const message = await logMessage(supabase, lead, values, values.recipient ?? null, approved);
  refresh();
  return message;
}

async function logMessage(
  supabase: SupabaseClient,
  lead: PotentialCustomer,
  values: z.output<typeof sentMessageSchema>,
  recipient: string | null,
  approved: LeadMessage | null
) {
  const now = new Date().toISOString();
  const row = {
    lead_id: values.leadId,
    kind: values.kind,
    channel: values.channel,
    language: values.language,
    subject: values.subject,
    body: values.body,
    recipient,
  };
  let message: LeadMessage | null = null;
  if (approved) {
    // The approved draft becomes the sent message — one row from draft to sent.
    const { data, error } = await supabase
      .from("lead_messages")
      .update({ ...row, status: "sent", sent_at: now })
      .eq("id", approved.id)
      .select("*")
      .single();
    if (error) throw error;
    message = data as LeadMessage;
  } else {
    let { data, error } = await supabase.from("lead_messages").insert(row).select("*").single();
    // Older databases without the recipient column: log without it rather than not at all.
    if (error && isMissingColumnError(error)) {
      const { recipient: _recipient, ...withoutRecipient } = row;
      void _recipient;
      ({ data, error } = await supabase.from("lead_messages").insert(withoutRecipient).select("*").single());
    }
    if (error) throw error;
    message = data as LeadMessage;
  }

  // The follow-up sequence moves on with each step that's sent.
  const today = osloToday();
  const open =
    !lead.responded && !CLOSED_STATUSES.includes(lead.status as PotentialCustomerStatus) && !lead.do_not_contact;
  const followUp =
    values.kind === "final_follow_up"
      ? { next_follow_up_on: null, next_action: "Sequence finished — wait for a reply" }
      : values.kind === "follow_up"
        ? open
          ? {
              next_follow_up_on: addBusinessDays(today, FINAL_FOLLOW_UP_BUSINESS_DAYS),
              next_action: "Send the final follow-up",
            }
          : { next_follow_up_on: null }
        : open && values.kind !== "phone_opener" && !lead.next_follow_up_on
          ? { next_follow_up_on: addBusinessDays(today, FOLLOW_UP_BUSINESS_DAYS), next_action: "Send the follow-up" }
          : {};

  await updateLead(supabase, values.leadId, {
    ...(values.channel === "phone" ? { call_made: true } : { message_sent: true }),
    first_contacted_on: lead.first_contacted_on ?? today,
    status: lead.status === "new" ? "contacted" : lead.status,
    // A lead with no saved email gets the address it was just emailed at.
    ...(recipient && !lead.email ? { email: recipient } : {}),
    ...followUp,
  });

  return message;
}

const sendEmailSchema = sentMessageSchema.omit({ channel: true }).extend({
  to: z.string().trim().pipe(z.email("That doesn't look like a valid email address.")),
  subject: z.string().trim().min(1, "The email needs a subject.").max(300),
});

export type SendEmailInput = z.input<typeof sendEmailSchema>;

/**
 * Sends an approved outreach email through the site's Gmail account and logs
 * it, including the address it went to.
 */
export async function sendLeadEmail(
  input: SendEmailInput
): Promise<{ message: LeadMessage | null; to: string; logged: boolean }> {
  const values = sendEmailSchema.parse(input);
  const supabase = await createClient();

  // This sends real email, so check the session explicitly rather than
  // relying on RLS (which only guards the database, not nodemailer).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const lead = await loadLead(supabase, values.leadId);
  if (lead.do_not_contact) throw new Error("This lead asked not to be contacted.");
  const withChannel = { ...values, channel: "email" as const };
  const approved = await requireApproved(supabase, lead, withChannel);
  const { to } = values;

  const mailer = getMailer();
  if (!mailer) {
    throw new Error("Email isn't set up: MAIL_SMTP_USER / MAIL_SMTP_PASSWORD are missing.");
  }

  await mailer.transporter.sendMail({
    from: fromHeader(mailer, "Olga, Enodre"),
    to,
    replyTo: REPLY_TO,
    subject: values.subject,
    text: values.body,
  });

  // The email is out — a failed log must not look like a failed send (a retry
  // would email them twice), so report it separately.
  let message: LeadMessage | null = null;
  try {
    message = await logMessage(supabase, lead, withChannel, to, approved);
  } catch (error) {
    console.error("Outreach email sent but not logged:", error);
  }

  refresh();
  return { message, to, logged: message !== null };
}

// ---------------------------------------------------------------------------
// Replies and stopping the sequence

const RESPONSE_EFFECTS: Record<ResponseType, Record<string, unknown>> = {
  positive: { attitude: "positive", status: "interested", next_action: "Reply and suggest a short call" },
  not_now: { attitude: "neutral", next_action: "Thank them; check back in a couple of months" },
  has_system: { attitude: "neutral", next_action: "Ask what's still done by hand around their system" },
  not_relevant: { attitude: "negative", status: "not_interested", next_action: null },
};

/** Records how a prospect replied: stops the sequence and sets the next step. */
export async function recordResponse(leadId: string, response: ResponseType) {
  const id = z.uuid().parse(leadId);
  const type = z.enum(["positive", "not_now", "has_system", "not_relevant"]).parse(response);
  const supabase = await createClient();
  await updateLead(supabase, id, { responded: true, next_follow_up_on: null, ...RESPONSE_EFFECTS[type] });
  refresh();
}

/** Stops the follow-up sequence. "do_not_contact" also blocks any further sending. */
export async function stopSequence(leadId: string, reason: "declined" | "do_not_contact" | "paused") {
  const id = z.uuid().parse(leadId);
  const why = z.enum(["declined", "do_not_contact", "paused"]).parse(reason);
  const supabase = await createClient();
  await updateLead(supabase, id, {
    next_follow_up_on: null,
    next_action: why === "paused" ? "Follow-ups paused" : null,
    ...(why === "declined" ? { status: "not_interested" } : {}),
    ...(why === "do_not_contact" ? { status: "not_interested", do_not_contact: true } : {}),
  });
  refresh();
}

// ---------------------------------------------------------------------------
// Research facts on the lead

const factSchema = z.object({
  fact: z.string().trim().min(3, "Write the fact.").max(500),
  source_url: z.string().trim().pipe(z.url("Add the link where you found it.")),
});

/** Adds a verified fact (with its source) to the lead's research. */
export async function addLeadFact(leadId: string, input: z.input<typeof factSchema>) {
  const id = z.uuid().parse(leadId);
  const fact = factSchema.parse(input);
  const supabase = await createClient();
  const lead = await loadLead(supabase, id);
  if (lead.research === undefined) throw new Error("Research needs outreach_system.sql — run it in Supabase.");
  const research = { ...(lead.research ?? {}), facts: [...(lead.research?.facts ?? []), fact] };
  await updateLead(supabase, id, { research });
  refresh();
}

export async function removeLeadFact(leadId: string, index: number) {
  const id = z.uuid().parse(leadId);
  const position = z.number().int().min(0).parse(index);
  const supabase = await createClient();
  const lead = await loadLead(supabase, id);
  const facts = [...(lead.research?.facts ?? [])];
  facts.splice(position, 1);
  await updateLead(supabase, id, { research: { ...(lead.research ?? {}), facts } });
  refresh();
}
