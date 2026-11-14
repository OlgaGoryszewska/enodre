import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { companyKey } from "@/lib/application-search";
import {
  companyFromAddress,
  isGulfAddress,
  isAutoReply,
  isJobEmail,
  replyMatcher,
  replySnippet,
  type AppliedTo,
  type ReplyTarget,
  type SentTo,
} from "@/lib/email-replies";

// Server-only. Reads replies from the two inboxes and saves the ones from
// people we wrote to:
// - Gmail (GMAIL_USER / GMAIL_APP_PASSWORD, olga.goryszewska@gmail.com),
//   where job applications and recruiter messages get their answers: from the
//   addresses we wrote to, and from companies applied to by form or LinkedIn.
// - info@enodre.com through Microsoft Graph (MS_TENANT_ID / MS_CLIENT_ID /
//   MS_CLIENT_SECRET), where customer replies arrive. Microsoft has switched off
//   password logins for reading mail, so this needs an app registration.
// Envelopes and the start of the new text only; the quoted message is dropped.

const LOOKBACK_DAYS = 30;
// Gmail: how far back to read your own Sent mail for job emails, and replies to them.
const GMAIL_LOOKBACK_DAYS = 60;
const MAX_SENT_SCANNED = 500;
// Gmail search terms per query, so the query stays well under its length limit.
const TERMS_PER_SEARCH = 40;
const MAX_MESSAGES = 150;
const GRAPH_PAGES = 5;
const OWN_DOMAINS = ["enodre.com"];

export type FoundReply = {
  mailbox: "gmail" | "info";
  messageId: string;
  from: string;
  fromName: string | null;
  subject: string;
  receivedAt: string;
  snippet: string;
  isAuto: boolean;
  target: ReplyTarget;
};

export type ReplyCheckResult = {
  found: number;
  saved: number;
  people: number;
  /** Saved replies whose automatic/person label changed with the current rules. */
  reclassified: number;
  problems: string[];
};

const since = () => new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);

/** Everyone we've emailed, per inbox their answer arrives in. */
async function loadSentTo(supabase: SupabaseClient) {
  const [sent, contacts, leads, leadMessages, applied, pmu] = await Promise.all([
    supabase.from("job_applications_sent").select("company, to_email"),
    supabase.from("career_contacts").select("id, name, organisation, email, status").not("email", "is", null),
    supabase.from("potential_customers").select("id, name, company, email").not("email", "is", null),
    supabase.from("lead_messages").select("lead_id, recipient").eq("channel", "email").not("recipient", "is", null),
    supabase.from("job_postings").select("company").in("status", ["applied", "interview"]).not("company", "is", null),
    // PMU clinics you've written to (missing until pmu_agent.sql has run).
    supabase.from("pmu_targets").select("name, email").not("email", "is", null).neq("status", "to_contact"),
  ]);

  const contactByEmail = new Map(
    (contacts.data ?? [])
      .filter((row) => row.status !== "to_contact")
      .map((row) => [String(row.email).toLowerCase(), row])
  );
  const jobs: SentTo[] = (sent.data ?? []).map((row) => {
    const contact = contactByEmail.get(row.to_email.toLowerCase());
    const company = row.company ?? row.to_email;
    return {
      email: row.to_email,
      target: { kind: "job", companyKey: companyKey(company), company, contactId: contact?.id ?? null },
    };
  });
  for (const contact of contactByEmail.values()) {
    const company = contact.organisation ?? contact.name;
    jobs.push({
      email: contact.email,
      target: { kind: "job", companyKey: companyKey(company), company, contactId: contact.id },
    });
  }

  const leadById = new Map((leads.data ?? []).map((row) => [row.id, row]));
  const customers: SentTo[] = (leads.data ?? []).map((row) => ({
    email: row.email,
    target: { kind: "lead", leadId: row.id, company: row.company || row.name },
  }));
  for (const message of leadMessages.data ?? []) {
    const lead = leadById.get(message.lead_id);
    if (lead) {
      customers.push({
        email: message.recipient,
        target: { kind: "lead", leadId: lead.id, company: lead.company || lead.name },
      });
    }
  }
  for (const clinic of pmu.data ?? []) {
    jobs.push({
      email: clinic.email,
      target: { kind: "job", companyKey: companyKey(clinic.name), company: clinic.name, contactId: null },
    });
  }

  // Applied by form or on LinkedIn: no address, so the reply is matched by name.
  const appliedTo: AppliedTo[] = (applied.data ?? []).map((row) => ({
    company: row.company,
    target: { kind: "job", companyKey: companyKey(row.company), company: row.company, contactId: null },
  }));
  return { jobs, customers, appliedTo };
}

async function readGmail(sentTo: SentTo[], appliedTo: AppliedTo[]): Promise<FoundReply[]> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD aren't set.");
  const me = user.toLowerCase();

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass: pass.replace(/\s+/g, "") },
    logger: false,
  });
  const replies: FoundReply[] = [];
  await client.connect();
  // All Mail holds archived replies too; Bin and Spam are separate in Gmail,
  // and a reply deleted by hand or filtered as spam still counts. The folder
  // names depend on Gmail's language, so they're found by their role.
  const boxes = await client.list();
  const allMail = boxes.find((box) => box.specialUse === "\\All")?.path ?? "INBOX";
  const otherBoxes = boxes
    .filter((box) => box.specialUse === "\\Trash" || box.specialUse === "\\Junk")
    .map((box) => box.path);
  try {
    // Job emails you wrote yourself from Gmail: everyone you sent one to,
    // including threads you've since deleted (they move to the Bin).
    const fromSent: SentTo[] = [];
    for (const [box, query] of [
      [allMail, `in:sent newer_than:${GMAIL_LOOKBACK_DAYS}d`],
      ...otherBoxes.map((path) => [path, `from:me newer_than:${GMAIL_LOOKBACK_DAYS}d`] as const),
    ] as const) {
      const sentLock = await client.getMailboxLock(box);
      try {
        const sentUids = (await client.search({ gmraw: query }, { uid: true })) || [];
        const recent = [...sentUids].sort((a, b) => b - a).slice(0, MAX_SENT_SCANNED);
        if (recent.length === 0) continue;
        for await (const message of client.fetch(
          recent,
          { uid: true, envelope: true, bodyStructure: true },
          { uid: true }
        )) {
          const subject = message.envelope?.subject ?? "";
          const hasPdf = JSON.stringify(message.bodyStructure ?? {})
            .toLowerCase()
            .includes("pdf");
          for (const to of [...(message.envelope?.to ?? []), ...(message.envelope?.cc ?? [])]) {
            const address = to.address?.toLowerCase();
            if (!address || address === me || !isJobEmail({ subject, to: address, hasPdf })) continue;
            const company = companyFromAddress(address, to.name);
            fromSent.push({
              email: address,
              target: { kind: "job", companyKey: companyKey(company), company, contactId: null },
            });
          }
        }
      } finally {
        sentLock.release();
      }
    }

    // What the app knows comes first, so its company names win.
    const matcher = replyMatcher([...sentTo, ...fromSent], OWN_DOMAINS, appliedTo);
    const terms = matcher.searchTerms();
    if (terms.length === 0) return [];

    const seen = new Set<string>();
    for (const box of [allMail, ...otherBoxes]) {
      if (replies.length >= MAX_MESSAGES) break;
      const lock = await client.getMailboxLock(box);
      try {
        const uids = new Set<number>();
        for (let start = 0; start < terms.length; start += TERMS_PER_SEARCH) {
          const from = terms.slice(start, start + TERMS_PER_SEARCH).join(" OR ");
          const found = await client.search(
            { gmraw: `from:(${from}) -in:sent -from:me newer_than:${GMAIL_LOOKBACK_DAYS}d` },
            { uid: true }
          );
          for (const uid of found || []) uids.add(uid);
        }
        const newest = [...uids].sort((a, b) => b - a).slice(0, MAX_MESSAGES - replies.length);
        if (newest.length === 0) continue;

        for await (const message of client.fetch(
          newest,
          { uid: true, envelope: true, internalDate: true, source: { maxLength: 200_000 } },
          { uid: true }
        )) {
          const sender = message.envelope?.from?.[0];
          const from = sender?.address ?? "";
          const target = matcher.match(from, sender?.name ?? "");
          const messageId = message.envelope?.messageId ?? `gmail-${box}-${message.uid}`;
          if (!target || from.toLowerCase() === me || seen.has(messageId)) continue;
          seen.add(messageId);
          const parsed = message.source ? await simpleParser(message.source) : null;
          const headers: Record<string, string> = {};
          for (const name of ["auto-submitted", "x-autoreply", "x-autorespond", "precedence"]) {
            const value = parsed?.headers.get(name);
            if (typeof value === "string") headers[name] = value;
          }
          const subject = message.envelope?.subject ?? "";
          replies.push({
            mailbox: "gmail",
            messageId,
            from,
            fromName: sender?.name || null,
            subject,
            receivedAt: new Date(message.internalDate ?? message.envelope?.date ?? Date.now()).toISOString(),
            snippet: replySnippet(parsed?.text ?? ""),
            isAuto: isAutoReply({ subject, from, headers, text: parsed?.text?.slice(0, 2000) }),
            target,
          });
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return replies;
}

type GraphMessage = {
  id: string;
  internetMessageId?: string;
  subject?: string;
  receivedDateTime: string;
  bodyPreview?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  internetMessageHeaders?: { name: string; value: string }[];
};

async function readInfoMailbox(sentTo: SentTo[]): Promise<FoundReply[] | null> {
  const tenant = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const secret = process.env.MS_CLIENT_SECRET;
  const mailbox = process.env.MAIL_SMTP_USER;
  if (!tenant || !clientId || !secret || !mailbox) return null;
  const matcher = replyMatcher(sentTo, OWN_DOMAINS);

  const token = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: secret,
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  if (!token.ok) throw new Error(`Microsoft sign-in failed (${token.status}). Check the MS_* settings.`);
  const { access_token: accessToken } = (await token.json()) as { access_token: string };

  const params = new URLSearchParams({
    $filter: `receivedDateTime ge ${since().toISOString()}`,
    $orderby: "receivedDateTime desc",
    $select: "id,internetMessageId,subject,receivedDateTime,bodyPreview,from",
    $top: "100",
  });
  let url: string | null =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/mailFolders/inbox/messages?${params}`;
  const replies: FoundReply[] = [];
  for (let page = 0; url && page < GRAPH_PAGES; page++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Reading info@ failed (${response.status}). Does the app have Mail.Read?`);
    const body = (await response.json()) as { value: GraphMessage[]; "@odata.nextLink"?: string };
    for (const message of body.value) {
      const from = message.from?.emailAddress?.address ?? "";
      const target = matcher.match(from);
      if (!target) continue;
      const subject = message.subject ?? "";
      replies.push({
        mailbox: "info",
        messageId: message.internetMessageId ?? message.id,
        from,
        fromName: message.from?.emailAddress?.name || null,
        subject,
        receivedAt: message.receivedDateTime,
        snippet: replySnippet(message.bodyPreview ?? ""),
        isAuto: isAutoReply({ subject, from, text: message.bodyPreview }),
        target,
      });
    }
    url = body["@odata.nextLink"] ?? null;
  }
  return replies;
}

/**
 * Re-checks saved job-search replies with the current rules, so a template
 * counted as a reply before stops counting. A contact moved to "Replied" only
 * by templates goes back to "Contacted".
 */
async function reclassifyJobReplies(supabase: SupabaseClient, result: ReplyCheckResult) {
  const { data, error } = await supabase.from("email_replies").select("*").eq("kind", "job");
  if (error || !data) return;
  const changed = data
    .map((row) => ({
      ...row,
      auto: isAutoReply({ subject: row.subject ?? "", from: row.from_email, text: row.snippet ?? "" }),
    }))
    // Your own choice on a reply always stands.
    .filter((row) => !row.auto_set_by_hand && row.auto !== row.is_auto);
  for (const auto of [true, false]) {
    const ids = changed.filter((row) => row.auto === auto).map((row) => row.id);
    if (ids.length) await supabase.from("email_replies").update({ is_auto: auto }).in("id", ids);
  }
  const byPerson = new Set(
    data
      .filter((row) => !(changed.find((item) => item.id === row.id)?.auto ?? row.is_auto))
      .map((row) => row.contact_id)
  );
  const onlyTemplates = [
    ...new Set(
      changed.filter((row) => row.auto && row.contact_id && !byPerson.has(row.contact_id)).map((row) => row.contact_id)
    ),
  ] as string[];
  if (onlyTemplates.length) {
    await supabase
      .from("career_contacts")
      .update({ status: "contacted", updated_at: new Date().toISOString() })
      .in("id", onlyTemplates)
      .eq("status", "replied");
  }
  result.reclassified = changed.length;
}

/**
 * A reply from a PMU clinic you wrote to goes into its history once, and
 * moves it to "Replied" if it was still waiting. Matched on the address you
 * wrote to, or the clinic's own domain.
 */
async function syncPmuReplies(supabase: SupabaseClient) {
  const [{ data: clinics, error }, { data: replies }] = await Promise.all([
    supabase.from("pmu_targets").select("id, email, status").not("email", "is", null),
    supabase
      .from("email_replies")
      .select("id, from_email, subject, received_at")
      .eq("kind", "job")
      .eq("is_auto", false)
      .order("received_at", { ascending: true }),
  ]);
  if (error || !clinics?.length || !replies?.length) return;
  const matcher = replyMatcher(
    clinics.map((clinic) => ({
      email: clinic.email,
      target: { kind: "job" as const, companyKey: clinic.id, company: clinic.id, contactId: null },
    })),
    OWN_DOMAINS
  );
  const found = replies
    .map((reply) => ({ reply, target: matcher.match(reply.from_email) }))
    .filter((item) => item.target && item.target.kind === "job");
  if (found.length === 0) return;
  const { data: logged } = await supabase
    .from("pmu_activity")
    .upsert(
      found.map(({ reply, target }) => ({
        target_id: target!.kind === "job" ? target!.companyKey : "",
        kind: "replied",
        at: reply.received_at,
        note: `Email from ${reply.from_email}${reply.subject ? `: ${reply.subject}` : ""}`,
        email_reply_id: reply.id,
      })),
      { onConflict: "email_reply_id", ignoreDuplicates: true }
    )
    .select("target_id");
  const waiting = new Set(["to_contact", "contacted", "followed_up", "not_now"]);
  const ids = [...new Set((logged ?? []).map((row) => row.target_id))].filter((id) =>
    waiting.has(clinics.find((clinic) => clinic.id === id)?.status ?? "")
  );
  if (ids.length) {
    await supabase
      .from("pmu_targets")
      .update({ status: "replied", next_action: null, next_action_on: null, updated_at: new Date().toISOString() })
      .in("id", ids);
  }
}

/**
 * Reads both inboxes and saves new replies. A new reply from a person stops
 * the lead's follow-ups (it's marked as responded) and moves a contacted
 * recruiter or company to "Replied". Automatic replies are saved but change
 * nothing.
 */
export async function checkReplies(supabase: SupabaseClient): Promise<ReplyCheckResult> {
  const result: ReplyCheckResult = { found: 0, saved: 0, people: 0, reclassified: 0, problems: [] };
  const { jobs, customers, appliedTo } = await loadSentTo(supabase);

  const replies: FoundReply[] = [];
  try {
    replies.push(...(await readGmail(jobs, appliedTo)));
  } catch (error) {
    console.error("Gmail reply check failed:", error);
    result.problems.push(`Gmail: ${error instanceof Error ? error.message : "couldn't read the inbox."}`);
  }
  try {
    const info = await readInfoMailbox(customers);
    if (info) replies.push(...info);
    else result.problems.push("info@enodre.com isn't connected yet, so customer replies aren't checked.");
  } catch (error) {
    console.error("info@ reply check failed:", error);
    result.problems.push(`info@enodre.com: ${error instanceof Error ? error.message : "couldn't read the inbox."}`);
  }
  // The Gulf is out of the search: its replies aren't saved.
  const kept = replies.filter((reply) => !isGulfAddress(reply.from));
  replies.length = 0;
  replies.push(...kept);
  result.found = replies.length;
  if (replies.length === 0) {
    await reclassifyJobReplies(supabase, result);
    await syncPmuReplies(supabase).catch((error) => console.error("PMU reply sync failed:", error));
    return result;
  }

  // Only the rows that weren't saved before come back, so each reply acts once.
  const { data: inserted, error } = await supabase
    .from("email_replies")
    .upsert(
      replies.map((reply) => ({
        mailbox: reply.mailbox,
        message_id: reply.messageId,
        from_email: reply.from.toLowerCase(),
        from_name: reply.fromName,
        subject: reply.subject,
        received_at: reply.receivedAt,
        snippet: reply.snippet,
        is_auto: reply.isAuto,
        kind: reply.target.kind,
        lead_id: reply.target.kind === "lead" ? reply.target.leadId : null,
        contact_id: reply.target.kind === "job" ? reply.target.contactId : null,
        company_key: reply.target.kind === "job" ? reply.target.companyKey : null,
        company: reply.target.company,
      })),
      { onConflict: "mailbox,message_id", ignoreDuplicates: true }
    )
    .select("kind, lead_id, contact_id, is_auto");
  if (error) {
    result.problems.push("Couldn't save replies. Has supabase/email_replies.sql been run?");
    console.error("Saving replies failed:", error);
    return result;
  }
  result.saved = inserted?.length ?? 0;

  const people = (inserted ?? []).filter((row) => !row.is_auto);
  result.people = people.length;
  const leadIds = [...new Set(people.map((row) => row.lead_id).filter(Boolean))] as string[];
  const contactIds = [...new Set(people.map((row) => row.contact_id).filter(Boolean))] as string[];
  const now = new Date().toISOString();
  if (leadIds.length) {
    const { error: leadError } = await supabase
      .from("potential_customers")
      .update({ responded: true, next_follow_up_on: null, updated_at: now })
      .in("id", leadIds)
      .eq("responded", false);
    if (leadError) result.problems.push("Couldn't mark leads as replied.");
  }
  if (contactIds.length) {
    const { error: contactError } = await supabase
      .from("career_contacts")
      .update({ status: "replied", updated_at: now })
      .in("id", contactIds)
      .eq("status", "contacted");
    if (contactError) result.problems.push("Couldn't mark contacts as replied.");
  }
  await reclassifyJobReplies(supabase, result);
  await syncPmuReplies(supabase).catch((error) => console.error("PMU reply sync failed:", error));
  return result;
}
