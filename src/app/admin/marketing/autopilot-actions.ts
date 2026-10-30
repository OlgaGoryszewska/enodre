"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMailer } from "@/lib/mailer";
import { osloToday } from "@/lib/gtm-logic";
import type { LeadCandidate } from "@/lib/lead-candidate";
import { isCompanyAddress } from "@/lib/email-discovery";
import { checkMessage } from "@/lib/message-quality";
import { AUTOPILOT, nextAutoStep, passesAutopilotBar, type AutoKind } from "@/lib/outreach-autopilot";
import {
  buildMessage,
  leadLanguage,
  messageKindLabels,
  verifiedFacts,
  type LeadMessage,
} from "@/lib/outreach-templates";
import type { PotentialCustomer } from "@/lib/potential-customer";
import { approveLeadCandidate, findHiringCompanies } from "@/app/admin/marketing/lead-agent-actions";
import { approveMessage, findLeadEmail, sendLeadEmail } from "@/app/admin/marketing/outreach-actions";

// "Run outreach": the steps done by hand in the dashboard, in one go —
// find companies hiring (NAV), add queued companies as leads (with email
// search), write each due email from the template, check it, approve it and
// send it from info@enodre.com. Rules in src/lib/outreach-autopilot.ts.
// Free: no Claude. Preview runs the same checks and sends nothing.

const inputSchema = z.object({ dryRun: z.boolean(), findNew: z.boolean() });

export type AutopilotItem = {
  company: string;
  leadId?: string;
  step: string;
  result: "sent" | "would_send" | "added" | "would_add" | "skipped" | "failed";
  detail: string;
};

export type AutopilotResult = {
  dryRun: boolean;
  items: AutopilotItem[];
  found: { added: number; employers: number } | null;
  sentNew: number;
  sentFollowUps: number;
  newLeftToday: number;
  /** First emails already sent today before this run (they count toward the cap). */
  newSentBefore: number;
  stopped: string | null;
};

const FIRST_CONTACT = ["connection_note", "first_message", "email", "phone_opener"];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");

export async function runOutreach(input: z.input<typeof inputSchema>): Promise<AutopilotResult> {
  const { dryRun, findNew } = inputSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const started = Date.now();
  const timeLeft = () => Date.now() - started < AUTOPILOT.timeBudgetMs;
  const items: AutopilotItem[] = [];
  const result: AutopilotResult = {
    dryRun,
    items,
    found: null,
    sentNew: 0,
    sentFollowUps: 0,
    newLeftToday: 0,
    newSentBefore: 0,
    stopped: null,
  };

  // Mail must go out from info@enodre.com (Microsoft 365), not the Gmail fallback.
  if (!dryRun && getMailer()?.provider !== "microsoft365") {
    throw new Error("Sending isn't set up for info@enodre.com — add MAIL_SMTP_USER / MAIL_SMTP_PASSWORD first.");
  }

  // 1. Find companies hiring developers/designers (free, about a minute).
  if (findNew && !dryRun) {
    try {
      const found = await findHiringCompanies({ days: AUTOPILOT.findDays, scope: "partners" });
      result.found = { added: found.added, employers: found.employers };
    } catch (error) {
      items.push({ company: "Hiring search", step: "Find", result: "failed", detail: errorText(error) });
    }
  }

  // 2. Queued companies with a hiring signal or finished research become leads.
  {
    // "*": hiring_signal only exists once partner_track.sql has run.
    const { data, error } = await supabase
      .from("lead_candidates")
      .select("*")
      .in("status", ["found", "researched"])
      .is("potential_customer_id", null)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const candidates = (data ?? []) as LeadCandidate[];
    const ready = candidates
      .filter((row) => row.status === "researched" || Boolean(row.hiring_signal?.ads.length))
      .slice(0, AUTOPILOT.candidatesPerRun);
    for (const candidate of ready) {
      if (dryRun) {
        items.push({
          company: candidate.company,
          step: "Add",
          result: "would_add",
          detail: "Added as a lead, with email search",
        });
        continue;
      }
      if (!timeLeft()) {
        result.stopped = "Time limit reached — run it again to continue.";
        break;
      }
      try {
        await approveLeadCandidate(candidate.id);
        items.push({ company: candidate.company, step: "Add", result: "added", detail: "Added as a lead" });
      } catch (error) {
        items.push({ company: candidate.company, step: "Add", result: "failed", detail: errorText(error) });
      }
    }
  }

  // 3. New leads without an email: the register, their website, or a likely
  // domain that names them. Runs in Preview too — saving a company address
  // sends nothing, and the preview then shows what would really go out.
  {
    const { data, error } = await supabase
      .from("potential_customers")
      .select("id, name, company")
      .eq("status", "new")
      .is("email", null)
      .order("created_at", { ascending: true })
      .limit(AUTOPILOT.emailSearchesPerRun);
    if (error) throw error;
    const queue = [...(data ?? [])];
    while (queue.length > 0) {
      if (!timeLeft()) {
        result.stopped = "Time limit reached — run it again to continue.";
        break;
      }
      const batch = queue.splice(0, AUTOPILOT.emailSearchConcurrency);
      const outcomes = await Promise.all(
        batch.map((lead) =>
          findLeadEmail(lead.id).then(
            (found) => ({ found }),
            (error: unknown) => ({ error })
          )
        )
      );
      batch.forEach((lead, index) => {
        const outcome = outcomes[index];
        const found = "found" in outcome ? outcome.found : null;
        items.push({
          company: lead.company || lead.name,
          leadId: lead.id,
          step: "Find email",
          result: found?.saved ? "added" : "skipped",
          detail: !found
            ? errorText("error" in outcome ? outcome.error : null)
            : found.saved
              ? `Found ${found.saved}`
              : found.found.length
                ? "Only personal addresses found — use LinkedIn"
                : "No company email found — use LinkedIn or their contact form",
        });
      });
    }
  }

  // 4. Every lead's due email.
  const [{ data: leadRows, error: leadsError }, { data: messageRows, error: messagesError }] = await Promise.all([
    supabase.from("potential_customers").select("*").order("created_at", { ascending: true }),
    supabase.from("lead_messages").select("*"),
  ]);
  if (leadsError) throw leadsError;
  if (messagesError) throw messagesError;
  const leads = (leadRows ?? []) as PotentialCustomer[];
  const messages = (messageRows ?? []) as LeadMessage[];
  const today = osloToday();
  const isSent = (message: LeadMessage) => (message.status ?? "sent") === "sent";

  const newSentToday = messages.filter(
    (message) =>
      isSent(message) &&
      message.channel === "email" &&
      FIRST_CONTACT.includes(message.kind) &&
      osloToday(new Date(message.sent_at ?? message.created_at)) === today
  ).length;
  result.newSentBefore = newSentToday;
  let newLeft = Math.max(0, AUTOPILOT.newPerDay - newSentToday);
  let followUpsLeft: number = AUTOPILOT.followUpsPerRun;

  type Planned = { lead: PotentialCustomer; kind: AutoKind };
  const planned: Planned[] = [];
  for (const lead of leads) {
    const own = messages.filter((message) => message.lead_id === lead.id);
    const companyAddress = Boolean(
      lead.email &&
      isCompanyAddress(lead.email, { company: lead.company, person: lead.name !== lead.company ? lead.name : null })
    );
    const step = nextAutoStep(lead, own.filter(isSent), companyAddress, today);
    if ("kind" in step) planned.push({ lead, kind: step.kind });
    else if (lead.email && !step.skip.startsWith("Follow-up due") && step.skip !== "Sequence finished") {
      items.push({
        company: lead.company || lead.name,
        leadId: lead.id,
        step: "Check",
        result: "skipped",
        detail: step.skip.startsWith("Personal") ? `${step.skip}: ${lead.email}` : step.skip,
      });
    }
  }
  // Follow-ups first — they're the ones with a date.
  planned.sort((a, b) => Number(a.kind === "first_message") - Number(b.kind === "first_message"));

  for (const { lead, kind } of planned) {
    const company = lead.company || lead.name;
    const step = messageKindLabels[kind];
    if (!timeLeft()) {
      result.stopped = "Time limit reached — run it again to continue.";
      break;
    }
    if (kind === "first_message" && newLeft === 0) {
      items.push({
        company,
        leadId: lead.id,
        step,
        result: "skipped",
        detail: `Daily limit of ${AUTOPILOT.newPerDay} new companies reached`,
      });
      continue;
    }
    if (kind !== "first_message" && followUpsLeft === 0) {
      items.push({ company, leadId: lead.id, step, result: "skipped", detail: "Follow-up limit for one run reached" });
      continue;
    }

    // Your own work wins: an approved message goes as approved; an unfinished
    // draft is left for you rather than overwritten.
    const open = messages.find(
      (message) =>
        message.lead_id === lead.id &&
        message.kind === kind &&
        (message.status === "draft" || message.status === "approved")
    );
    if (open?.status === "draft") {
      items.push({
        company,
        leadId: lead.id,
        step,
        result: "skipped",
        detail: "You have an unfinished draft — approve or delete it",
      });
      continue;
    }
    const language = leadLanguage(lead);
    const built = open ? { subject: open.subject, body: open.body } : buildMessage(kind, language, lead);
    if (!built.subject) {
      items.push({ company, leadId: lead.id, step, result: "skipped", detail: "No subject" });
      continue;
    }
    if (!open) {
      const issues = checkMessage({
        kind,
        language,
        body: built.body,
        companyName: lead.company || lead.name,
        verifiedFacts: verifiedFacts(lead).map((fact) => fact.fact),
      });
      if (!passesAutopilotBar(issues)) {
        items.push({
          company,
          leadId: lead.id,
          step,
          result: "skipped",
          detail: `Needs you: ${issues.map((issue) => issue.title).join("; ")}`,
        });
        continue;
      }
    }

    if (dryRun) {
      items.push({
        company,
        leadId: lead.id,
        step,
        result: "would_send",
        detail: `To ${lead.email} · “${built.subject}”`,
      });
    } else {
      const message = { leadId: lead.id, kind, language, subject: built.subject, body: built.body };
      try {
        if (!open) await approveMessage({ ...message, channel: "email" });
        const sent = await sendLeadEmail({ ...message, to: lead.email! });
        items.push({
          company,
          leadId: lead.id,
          step,
          result: "sent",
          detail: `To ${sent.to}${sent.logged ? "" : " — sent, but not logged: check the lead before running again"}`,
        });
        await sleep(AUTOPILOT.delayBetweenEmailsMs);
      } catch (error) {
        const text = errorText(error);
        items.push({ company, leadId: lead.id, step, result: "failed", detail: text });
        // A mail-server problem would fail every email the same way.
        if (/auth|smtp|535|5\.7\.|connection|ECONN|ETIMEDOUT/i.test(text)) {
          result.stopped = `Stopped: the mail server refused (${text}).`;
          break;
        }
        continue;
      }
    }
    if (kind === "first_message") {
      newLeft--;
      if (!dryRun) result.sentNew++;
    } else {
      followUpsLeft--;
      if (!dryRun) result.sentFollowUps++;
    }
  }

  result.newLeftToday = newLeft;
  revalidatePath("/admin/marketing", "layout");
  revalidatePath("/admin/execution");
  return result;
}
