/** One line of the companies table: a company we messaged, or a search result. */
export type CompanyRow = {
  id: string;
  // Its page, by companyKey. Null when we don't know the company's name.
  key: string | null;
  company: string;
  what: string;
  contact: string | null;
  date: string | null;
  status: string | null;
  url: string | null;
  // The cover letter or emails, when there are any.
  text: string | null;
  note?: string | null;
  /** The status you set yourself, or null when it's worked out from messages. */
  tracked?: CompanyStatus | null;
  /** The worked-out status, shown when you clear your own. */
  autoStatus?: string | null;
  hidden?: boolean;
};

export const COMPANY_STATUS_VALUES = [
  "waiting",
  "contact_them",
  "talking",
  "interview",
  "offer",
  "declined",
  "closed",
] as const;
export type CompanyStatus = (typeof COMPANY_STATUS_VALUES)[number];

export const companyStatusLabels: Record<CompanyStatus, string> = {
  waiting: "Waiting for reply",
  contact_them: "Contact them",
  talking: "In talks",
  interview: "Interview",
  offer: "Offer",
  declined: "Declined",
  closed: "Closed",
};

export type CompanyTracking = {
  key: string;
  company: string;
  status: CompanyStatus | null;
  note: string;
  // Missing until company_tracking.sql has been run again.
  hidden?: boolean;
};

export const companyKey = (name: string) => name.trim().toLowerCase();
export const companyPath = (key: string) => `/admin/linkedin/company/${encodeURIComponent(key)}`;

const TALKING = new Set(["Replied", "Contact them", "In talks", "Interview", "Interviewing", "Offer"]);

/** Companies with a conversation going, as opposed to waiting, declined or closed. */
export const inTalks = (rows: CompanyRow[]) => rows.filter((row) => TALKING.has(row.status ?? ""));

/** Your own status and note on top of what the rows say. */
export function applyTracking(rows: CompanyRow[], tracked: CompanyTracking[]): CompanyRow[] {
  const byKey = new Map(tracked.map((item) => [item.key, item]));
  return rows.map((row) => {
    const item = row.key ? byKey.get(row.key) : undefined;
    if (!item) return { ...row, tracked: null, autoStatus: row.status };
    return {
      ...row,
      status: item.status ? companyStatusLabels[item.status] : row.status,
      note: item.note || null,
      tracked: item.status,
      autoStatus: row.status,
      hidden: Boolean(item.hidden),
    };
  });
}

/**
 * A PostgREST or() filter: the term anywhere in any of the columns. Characters
 * with a meaning in a pattern or a filter become "_", which matches any one
 * character, so what's typed is always taken literally enough.
 */
export function searchFilter(columns: string[], term: string) {
  const safe = term.trim().replace(/[%_*\\"]/g, "_");
  return columns.map((column) => `${column}.ilike."%${safe}%"`).join(",");
}

export type SentRow = {
  id: string;
  created_at: string;
  kind: "ad" | "open";
  company: string | null;
  to_email: string;
  subject: string;
  body: string;
  job_postings?: { status: string } | null;
};

export type ContactRow = {
  id: string;
  kind: string;
  name: string;
  organisation: string | null;
  email: string | null;
  website: string | null;
  linkedin: string | null;
  status: string;
  last_contacted_on: string | null;
  notes: string | null;
};

/** A row from Headhunters: title holds the person's name, company the agency. */
export type RecruiterRow = {
  id: string;
  created_at: string;
  title: string;
  company: string | null;
  url: string | null;
  note: string | null;
  proposal_sent: boolean;
};

const CONTACT_STATUS: Record<string, string> = { contacted: "Sent", replied: "Replied", interviewing: "Interviewing" };
const POSTING_STATUS: Record<string, string> = { interview: "Interview", rejected: "Rejected" };

export const recruiterKey = (row: Pick<RecruiterRow, "title" | "company">) => companyKey(row.company ?? row.title);
const CONTACT_KINDS: Record<string, string> = { agency: "Agency", recruiter: "Recruiter", company: "Company" };
export const contactKind = (row: Pick<ContactRow, "kind" | "name" | "organisation">) =>
  [CONTACT_KINDS[row.kind] ?? row.kind, row.organisation ? row.name : null].filter(Boolean).join(" · ");
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Every company we've messaged, one row each, newest first: what the agent or
 * Message all sent, plus contacts marked as contacted by hand. A reply or an
 * interview beats "Sent" as the status, and your own status beats both.
 */
export function messagedCompanies(
  sent: SentRow[],
  contacts: ContactRow[],
  tracked: CompanyTracking[] = [],
  recruiters: RecruiterRow[] = [],
  replies: { key: string; company: string; date: string }[] = []
): CompanyRow[] {
  const groups = new Map<string, SentRow[]>();
  for (const row of sent) {
    const key = companyKey(row.company ?? row.to_email);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const reached = contacts.filter((contact) => CONTACT_STATUS[contact.status]);
  const contactFor = (key: string) =>
    reached.find((contact) => companyKey(contact.name) === key || companyKey(contact.organisation ?? "") === key);

  const rows: CompanyRow[] = [...groups.entries()].map(([key, messages]) => {
    const newest = [...messages].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const contact = contactFor(key);
    const postingStatus = newest.map((row) => POSTING_STATUS[row.job_postings?.status ?? ""]).find(Boolean);
    const contactStatus = contact?.status === "contacted" ? undefined : contact && CONTACT_STATUS[contact.status];
    return {
      id: `company-${newest[0].id}`,
      key,
      company: newest[0].company ?? newest[0].to_email,
      what: newest.length === 1 ? newest[0].subject : plural(newest.length, "message"),
      contact: [...new Set(newest.map((row) => row.to_email))].join(", "),
      date: newest[0].created_at,
      status: contactStatus ?? postingStatus ?? "Sent",
      url: contact?.website ?? contact?.linkedin ?? null,
      text: newest.map((row) => `Subject: ${row.subject}\n\n${row.body}`).join("\n\n---\n\n"),
    };
  });

  // Marked as contacted by hand: nothing was logged as sent.
  for (const contact of reached) {
    if (groups.has(companyKey(contact.name)) || groups.has(companyKey(contact.organisation ?? ""))) continue;
    rows.push({
      id: `company-${contact.id}`,
      key: companyKey(contact.organisation ?? contact.name),
      company: contact.organisation ?? contact.name,
      what: contactKind(contact),
      contact: contact.email,
      date: contact.last_contacted_on,
      status: CONTACT_STATUS[contact.status],
      url: contact.website ?? contact.linkedin,
      text: contact.notes,
    });
  }

  // Headhunters you sent a CV or message to, one row per agency.
  const known = new Set(rows.map((row) => row.key));
  const agencies = new Map<string, RecruiterRow[]>();
  for (const recruiter of recruiters) {
    const key = recruiterKey(recruiter);
    if (recruiter.proposal_sent && !known.has(key)) agencies.set(key, [...(agencies.get(key) ?? []), recruiter]);
  }
  for (const [key, people] of agencies) {
    const newest = [...people].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    rows.push({
      id: `company-${newest.id}`,
      key,
      company: newest.company ?? newest.title,
      what: `Recruiter · ${people.map((person) => person.title).join(", ")}`,
      contact: null,
      date: newest.created_at,
      status: "Sent",
      url: newest.url,
      text:
        people
          .map((person) => person.note)
          .filter(Boolean)
          .join("\n\n") || null,
    });
    known.add(key);
  }

  // Tracked from a search, without a message yet.
  for (const item of tracked) {
    if (known.has(item.key)) continue;
    rows.push({
      id: `company-${item.key}`,
      key: item.key,
      company: item.company,
      what: "Not messaged",
      contact: null,
      date: null,
      status: null,
      url: null,
      text: null,
    });
  }
  // Replies found in the inbox: a company you wrote to from Gmail yourself is
  // known only from its reply, so it gets a row of its own.
  for (const reply of replies) {
    if (known.has(reply.key)) continue;
    known.add(reply.key);
    rows.push({
      id: `company-reply-${reply.key}`,
      key: reply.key,
      company: reply.company,
      what: "Answered an email you sent from Gmail",
      contact: null,
      date: reply.date,
      status: null,
      url: null,
      text: null,
    });
  }

  // A reply turns Sent into Replied, unless you've set a status since.
  const replied = new Set(replies.map((reply) => reply.key));
  for (const row of rows) {
    if (row.key && replied.has(row.key) && (row.status === "Sent" || row.status === null)) row.status = "Replied";
  }
  const waiting = tracked.map((item) =>
    item.status === "waiting" && replied.has(item.key) ? { ...item, status: null } : item
  );
  return applyTracking(rows, waiting)
    .filter((row) => !row.hidden)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
