"use server";

import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addBusinessDays, FOLLOW_UP_BUSINESS_DAYS, osloToday } from "@/lib/gtm-logic";
import { isMissingColumnError, updateLead } from "@/lib/lead-updates";
import { CLOSED_STATUSES, type PotentialCustomerStatus } from "@/lib/potential-customer";
import {
  MESSAGE_CHANNEL_VALUES,
  MESSAGE_KIND_VALUES,
  MESSAGE_LANGUAGE_VALUES,
  type LeadMessage,
} from "@/lib/outreach-templates";

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

// Replies to outreach go to the shared inbox, not the sending Gmail account.
const REPLY_TO = "info@enodre.com";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Logs a message as sent and moves the lead along: ticks Message or Call,
 * sets the first-contact date (which starts the 5-day follow-up clock) and
 * moves a New lead to Contacted.
 */
export async function markLeadMessageSent(input: SentMessageInput): Promise<LeadMessage> {
  const values = sentMessageSchema.parse(input);
  const supabase = await createClient();
  const message = await logMessage(supabase, values, values.recipient ?? null);
  revalidatePath("/admin/marketing", "layout");
  return message;
}

async function logMessage(
  supabase: SupabaseClient,
  values: z.output<typeof sentMessageSchema>,
  recipient: string | null
) {
  const { data: lead, error: leadError } = await supabase
    .from("potential_customers")
    // "*" rather than a column list: next_follow_up_on may not exist yet.
    .select("*")
    .eq("id", values.leadId)
    .single();
  if (leadError) throw leadError;

  const row = {
    lead_id: values.leadId,
    kind: values.kind,
    channel: values.channel,
    language: values.language,
    subject: values.subject,
    body: values.body,
    recipient,
  };
  let { data: message, error: insertError } = await supabase.from("lead_messages").insert(row).select("*").single();
  // The recipient column arrived later; if the database doesn't have it yet,
  // log the message without it rather than not at all.
  if (insertError && isMissingColumnError(insertError)) {
    const { recipient: _recipient, ...withoutRecipient } = row;
    void _recipient;
    ({ data: message, error: insertError } = await supabase
      .from("lead_messages")
      .insert(withoutRecipient)
      .select("*")
      .single());
  }
  if (insertError) throw insertError;

  // Follow-up rules: a first contact schedules the one follow-up (4 business
  // days out); sending that follow-up ends routine reminders.
  const today = osloToday();
  const status = lead.status as PotentialCustomerStatus;
  const open = !lead.responded && !CLOSED_STATUSES.includes(status);
  const followUpPending = Boolean(lead.next_follow_up_on);
  const followUp =
    values.kind === "follow_up"
      ? { next_follow_up_on: null, next_action: "Wait for a reply — no more routine follow-ups" }
      : open && values.kind !== "phone_opener" && !followUpPending
        ? { next_follow_up_on: addBusinessDays(today, FOLLOW_UP_BUSINESS_DAYS), next_action: "Send the one follow-up" }
        : {};

  await updateLead(supabase, values.leadId, {
    ...(values.channel === "phone" ? { call_made: true } : { message_sent: true }),
    first_contacted_on: lead.first_contacted_on ?? today,
    status: lead.status === "new" ? "contacted" : lead.status,
    // A lead with no saved email gets the address it was just emailed at.
    ...(recipient && !lead.email ? { email: recipient } : {}),
    ...followUp,
  });

  return message as LeadMessage;
}

const sendEmailSchema = sentMessageSchema.omit({ channel: true }).extend({
  to: z.string().trim().pipe(z.email("That doesn't look like a valid email address.")),
  subject: z.string().trim().min(1, "The email needs a subject.").max(300),
});

export type SendEmailInput = z.input<typeof sendEmailSchema>;

/**
 * Sends an outreach email through the site's Gmail account and logs it,
 * including the address it went to. `to` is chosen in the composer (it
 * defaults to the lead's saved email); a lead without a saved email gets it.
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

  // Confirms the lead exists (and is visible to this session) before sending.
  const { error: leadError } = await supabase.from("potential_customers").select("id").eq("id", values.leadId).single();
  if (leadError) throw leadError;
  const { to } = values;

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    throw new Error("Email isn't set up: GMAIL_USER / GMAIL_APP_PASSWORD are missing.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });
  await transporter.sendMail({
    from: `"Olga, Enodre" <${gmailUser}>`,
    to,
    replyTo: REPLY_TO,
    subject: values.subject,
    text: values.body,
  });

  // The email is out — a failed log must not look like a failed send (a retry
  // would email them twice), so report it separately.
  let message: LeadMessage | null = null;
  try {
    message = await logMessage(supabase, { ...values, channel: "email" }, to);
  } catch (error) {
    console.error("Outreach email sent but not logged:", error);
  }

  revalidatePath("/admin/marketing", "layout");
  return { message, to, logged: message !== null };
}
