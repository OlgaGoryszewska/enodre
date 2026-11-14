// Matching incoming emails to the people we messaged. Pure: no I/O, so it's
// unit-tested; reply-check.ts does the reading and saving.

export type ReplyTarget =
  | { kind: "lead"; leadId: string; company: string }
  | { kind: "job"; companyKey: string; company: string; contactId: string | null };

export type SentTo = { email: string; target: ReplyTarget };
/** A company applied to without an address on record (a form, LinkedIn): matched by name. */
export type AppliedTo = { company: string; target: ReplyTarget };

const LEGAL =
  /\b(as|asa|ab|aps|oy|ltd|limited|inc|llc|gmbh|plc|bv|nv|sa|sl|srl|sp\.? ?z\.? ?o\.? ?o\.?|s\.a\.|group|norge|norway|polska|poland|nordic)\b\.?/gi;

/** "Visma Software AS" -> "vismasoftware": the name as it tends to appear in a domain. */
export function compactName(name: string) {
  return name
    .replace(LEGAL, " ")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
}
// Shorter names ("Kry", "Oda") are too likely to turn up inside other words.
const MIN_NAME = 5;

// Personal mail providers: a reply from someone else at gmail.com isn't from
// the company we wrote to, so these only match on the exact address.
const FREE_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.de",
  "online.no",
  "wp.pl",
  "o2.pl",
  "onet.pl",
  "interia.pl",
]);

export const isFreeDomain = (domain: string) => FREE_DOMAINS.has(domain.toLowerCase());

// A job email you wrote yourself in Gmail: an application, a CV, an introduction.
const JOB_SUBJECT =
  /(pmu|micropigment|permanent make ?up|semi-permanent|søknad|soknad|application|applying|apply|\bcv\b|resume|stilling|position|\brole\b|\bjob\b|vacanc|introduc|introduksjon|aplikacja|rekrutacja|portfolio|developer|designer|utvikler)/i;

/** Whether a message from Sent is about the job search, not personal mail. */
export function isJobEmail(input: { subject: string; to: string; hasPdf: boolean }) {
  if (JOB_SUBJECT.test(input.subject)) return true;
  // A PDF to a company address is almost always a CV; to a gmail.com friend, maybe not.
  return input.hasPdf && !isFreeDomain(domainOfAddress(input.to));
}

const domainOfAddress = (email: string) => email.trim().toLowerCase().split("@")[1] ?? "";

/** "kari@sopra-steria.no" -> "Sopra Steria": who a recipient works for, from the address. */
export function companyFromAddress(email: string, name?: string | null) {
  const domain = domainOfAddress(email);
  if (!domain || isFreeDomain(domain)) return name?.trim() || email.trim().toLowerCase();
  const label = domain.split(".").slice(-2, -1)[0] ?? domain;
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

const normal = (email: string) => email.trim().toLowerCase();
const domainOf = (email: string) => normal(email).split("@")[1] ?? "";
const sameTarget = (a: ReplyTarget, b: ReplyTarget) =>
  a.kind === "lead" && b.kind === "lead"
    ? a.leadId === b.leadId
    : a.kind === "job" && b.kind === "job" && a.companyKey === b.companyKey;

/**
 * Finds who a sender is: the exact address we wrote to, or anyone at that
 * company's own domain (a reply from hr@ to a letter sent to jobs@). A domain
 * shared by two different companies matches neither.
 */
export function replyMatcher(sentTo: SentTo[], ownDomains: string[] = [], appliedTo: AppliedTo[] = []) {
  const byAddress = new Map<string, ReplyTarget>();
  const byDomain = new Map<string, ReplyTarget | null>();
  const skip = new Set(ownDomains.map(normal));
  for (const { email, target } of sentTo) {
    const address = normal(email);
    if (!address.includes("@")) continue;
    if (!byAddress.has(address)) byAddress.set(address, target);
    const domain = domainOf(address);
    if (FREE_DOMAINS.has(domain) || skip.has(domain)) continue;
    const known = byDomain.get(domain);
    if (known === undefined) byDomain.set(domain, target);
    else if (known && !sameTarget(known, target)) byDomain.set(domain, null);
  }
  const byName = new Map<string, ReplyTarget | null>();
  for (const { company, target } of appliedTo) {
    const name = compactName(company);
    if (name.length < MIN_NAME) continue;
    const known = byName.get(name);
    if (known === undefined) byName.set(name, target);
    else if (known && !sameTarget(known, target)) byName.set(name, null);
  }
  /** "visma.no", or "Visma via Teamtailor" as the sender's name. */
  function matchName(address: string, senderName: string) {
    const domain = domainOf(address);
    if (skip.has(domain)) return null;
    const label = compactName(domain.split(".").slice(-2, -1)[0] ?? "");
    const sender = compactName(senderName);
    const hits = [...byName.entries()].filter(
      ([name, target]) =>
        target && (label === name || (!FREE_DOMAINS.has(domain) && label.startsWith(name)) || sender.includes(name))
    );
    const targets = hits.map(([, target]) => target!);
    return targets.length > 0 && targets.every((target) => sameTarget(target, targets[0])) ? targets[0] : null;
  }

  return {
    match(from: string, senderName = ""): ReplyTarget | null {
      const address = normal(from);
      return byAddress.get(address) ?? byDomain.get(domainOf(address)) ?? matchName(address, senderName);
    },
    /** What to search a mailbox for: exact addresses and company domains. */
    searchTerms(): string[] {
      const domains = [...byDomain.entries()].filter(([, target]) => target).map(([domain]) => domain);
      const addresses = [...byAddress.keys()].filter((address) => !byDomain.get(domainOf(address)));
      // Gmail's from: also searches the sender's name.
      const names = appliedTo
        .filter(({ company }) => (byName.get(compactName(company)) ?? null) !== null)
        .map(({ company }) => `"${company.replace(/"/g, "")}"`);
      return [...new Set([...domains, ...addresses, ...names])];
    },
  };
}

const AUTO_SUBJECT =
  /^(automatic reply|auto(matisk)?[ -]?(reply|svar|response)|autosvar|out of (the )?office|fravær|abwesenheit|odpowiedź automatyczna|undeliverable|delivery status notification|mail delivery failed)/i;
const AUTO_SENDER = /(^|[.\-_])(no-?reply|do-?not-?reply)([.\-_+]|@)|^(mailer-daemon|postmaster)@/i;

// Hiring systems: their mail is a template unless a person wrote it in (see PERSONAL).
const HIRING_SYSTEM =
  /@([a-z0-9-]+\.)*(teamtailor|myworkday|workday|greenhouse|greenhouse-mail|lever|hire\.lever|smartrecruiters|recruitee|jobylon|webcruiter|reachmee|hrmanager|easycruit|successfactors|icims|bamboohr|personio|jobvite|ashbyhq|workablemail|workable|breezy|homerun|pinpointhq|talentlyft|jobtrain|varbi|cvpartner|emply|hr-manager|recman|tellent|linkedin|indeed|bayt|naukrigulf|gulftalent|qureos|jobindex|finn)\.[a-z.]+$/i;
// Acknowledgements and form rejections, in the languages you apply in.
const TEMPLATE =
  /(thank you for (your )?(application|applying|your interest|cv|resume|email|message|enquiry|inquiry|contacting)|henvendelse(n)? (er )?mottatt|din henvendelse|saken din er registrert|saksn(umme)?r|\bticket\b|case (number|#)|\[#\d{3,}\]|has been received|er mottatt|thanks for (your )?(application|applying)|we (have )?received your (application|cv|email|message)|your application (has been|was) (received|submitted)|application (received|confirmation)|this is an automated|do not reply to this|please do not reply|unfortunately,? (we|you)|we have decided to (move forward|proceed) with other|not (been )?selected|takk for (din )?(søknad|henvendelse|interesse)|vi har mottatt (din )?(søknad|henvendelse)|bekreftelse på (mottatt )?søknad|dessverre|dziękujemy za (aplikację|zgłoszenie|przesłanie)|otrzymaliśmy (twoją )?aplikację|gracias por (tu|su) (candidatura|solicitud)|hemos recibido (tu|su) (candidatura|solicitud))/i;
// …but a person inviting you to talk counts, even through a hiring system.
const PERSONAL =
  /(du har fått svar|you have (a new )?(reply|response)|has replied|interview|intervju|invite you|would like to (meet|talk|speak|schedule|chat)|schedule a (call|meeting|chat)|book a time|are you available|når passer det|kan du (komme|ta en prat)|rozmow[aęy]|entrevista|could you call|give me a call|ring meg)/i;

// Subjects only a helpdesk or hiring system writes, whoever the sender is.
const SYSTEM_SUBJECT =
  /(henvendelse(n)? (er )?mottatt|^din henvendelse|saken din er registrert|\bsaksn(umme)?r\b|case (number|#)|ticket (#|number)|has been received|application (received|confirmation)|^thank you for (your )?(application|applying|cv|resume))/i;

// Shared inboxes (post@, hr@, careers@ …): a template is likely; a named person's own address isn't.
const SHARED_INBOX =
  /^(post|postmottak|kundesenter|servicedesk|ordre|faktura|bedrift|hei|hey|hello|hi|kontakt|contact|info|support|help|helpdesk|service|kundeservice|kunde|customer|jobs?|jobb|careers?|karriere|recruit(ment|ing)?|rekruttering|rekrutacja|kariera|praca|talent|hr|people|personal|office|mail|firmapost|admin|team|sales|salg|enquiries|inquiries|application|applications|soknad|søknad|cv)([.\-_+][a-z0-9]+)*@/i;

/**
 * Out-of-office, bounces, acknowledgements and form rejections: replies no
 * person wrote. A reply from a named person's own address counts as real,
 * even when it's a polite no; template wording only marks shared inboxes,
 * helpdesks and hiring systems as automatic.
 */
export function isAutoReply(input: {
  subject: string;
  from: string;
  headers?: Record<string, string>;
  /** The start of the reply's text, when known. */
  text?: string;
}) {
  const headers = Object.fromEntries(
    Object.entries(input.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value.toLowerCase()])
  );
  if (headers["auto-submitted"] && headers["auto-submitted"] !== "no") return true;
  if (headers["x-autoreply"] || headers["x-autorespond"]) return true;
  if (/^(auto_reply|bulk|junk)$/.test(headers.precedence ?? "")) return true;
  // "Re: Automatic reply …", "SV: Autosvar …"
  const subject = input.subject.trim().replace(/^((re|sv|aw|fw|fwd|odp|vs)\s*:\s*)+/i, "");
  const from = input.from.trim();
  if (AUTO_SUBJECT.test(subject) || AUTO_SENDER.test(from)) return true;
  const content = `${subject}\n${input.text ?? ""}`;
  if (PERSONAL.test(content)) return false;
  if (HIRING_SYSTEM.test(from) || SYSTEM_SUBJECT.test(subject)) return true;
  if (!SHARED_INBOX.test(from)) return false;
  return TEMPLATE.test(content);
}

/** The new text of a reply, without the quoted message under it. */
export function replySnippet(text: string, max = 500) {
  const cut = text.split(
    /\n\s*(On .{5,200}wrote:|Den .{5,200}skrev|W dniu .{5,200}napisał|-{2,}\s*Original Message|From: |Fra: |Od: )/i
  )[0];
  const lines = cut
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return lines.length > max ? `${lines.slice(0, max).trimEnd()}…` : lines;
}

// The Gulf is out of your search (Nov 2026): its companies and replies stay out of every list.
export const GULF_COUNTRIES = ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "GCC"];
const GULF_TLD = /\.(ae|sa|qa|kw|bh|om)$/i;

export function isGulfAddress(email: string | null | undefined) {
  return GULF_TLD.test((email ?? "").trim());
}
