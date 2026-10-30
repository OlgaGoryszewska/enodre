import { leadOpener, needsConsentFirst, type PotentialCustomer } from "@/lib/potential-customer";
import { PLAYBOOKS, type Industry } from "@/lib/industry-playbooks";
import { displayCompanyName, factOpening, profileOpening, roleFromAdTitle, roleOpening } from "@/lib/opener-templates";

// Message templates for the composer. Structure (first message):
//   A. A specific, verified observation — written by hand from a sourced fact.
//      With no verified fact, a plain, honest opening instead (never invented).
//   B. One operational question from the company's industry playbook.
//   C. One sentence on how Enodre helps.
//   D. A small, low-pressure ask: a 5-minute talk — not a full meeting.
// Follow-ups add context or ask differently; the final one makes declining easy.

export const MESSAGE_KIND_VALUES = [
  "connection_note",
  "first_message",
  "email",
  "follow_up",
  "final_follow_up",
  "phone_opener",
] as const;
export type MessageKind = (typeof MESSAGE_KIND_VALUES)[number];

export const messageKindLabels: Record<MessageKind, string> = {
  connection_note: "LinkedIn connection note",
  first_message: "First message",
  email: "Email",
  follow_up: "Follow-up",
  final_follow_up: "Final follow-up",
  phone_opener: "Phone opener",
};

export const MESSAGE_CHANNEL_VALUES = ["linkedin", "email", "phone", "contact_form"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNEL_VALUES)[number];

export const messageChannelLabels: Record<MessageChannel, string> = {
  linkedin: "LinkedIn",
  email: "Email",
  phone: "Phone",
  contact_form: "Contact form",
};

export const MESSAGE_LANGUAGE_VALUES = ["no", "en"] as const;
export type MessageLanguage = (typeof MESSAGE_LANGUAGE_VALUES)[number];

export const MESSAGE_STATUS_VALUES = ["draft", "approved", "sent"] as const;
export type MessageStatus = (typeof MESSAGE_STATUS_VALUES)[number];

// Kinds that can be sent straight from the composer by email.
export const EMAILABLE_KINDS: readonly MessageKind[] = ["first_message", "email", "follow_up", "final_follow_up"];

// LinkedIn's limit for a note on a connection request.
export const CONNECTION_NOTE_MAX = 300;

export const OPENER_GAP = {
  no: "[Skriv én konkret, sann observasjon om dem – fra faktaene til høyre]",
  en: "[Write one specific, true observation about them – from the facts on the right]",
};

export type LeadMessage = {
  id: string;
  created_at: string;
  lead_id: string;
  kind: MessageKind;
  channel: MessageChannel;
  language: MessageLanguage;
  subject: string | null;
  body: string;
  recipient: string | null;
  // Added by outreach_system.sql — undefined (= sent) for older rows.
  status?: MessageStatus;
  approved_at?: string | null;
  sent_at?: string | null;
};

/** A row counts as sent unless it's an unsent draft (older rows have no status = sent). */
export function isSentMessage(message: Pick<LeadMessage, "status">) {
  return (message.status ?? "sent") === "sent";
}

/** The channel a message kind is usually sent through — editable in the composer. */
export function defaultChannel(kind: MessageKind, lead: PotentialCustomer): MessageChannel {
  // Polish leads: no email or call before they've replied (see needsConsentFirst).
  if (needsConsentFirst(lead)) return "linkedin";
  if (kind === "email") return "email";
  if (kind === "phone_opener") return "phone";
  if (kind === "connection_note") return "linkedin";
  if (lead.best_channel === "email") return "email";
  if (lead.best_channel === "contact_form") return "contact_form";
  return "linkedin";
}

/** The language a lead is written to by default: English for Polish leads. */
export function leadLanguage(lead: Pick<PotentialCustomer, "country">): MessageLanguage {
  return lead.country === "PL" ? "en" : "no";
}

/** The playbook for a lead: its industry, or fuel for segment F, else generic. */
export function leadIndustry(lead: PotentialCustomer): Industry {
  if (lead.industry) return lead.industry;
  if (lead.segment === "F") return "fuel_energy";
  return "other";
}

/** Verified facts for a lead: research facts with a source, plus the opener fact. */
export function verifiedFacts(lead: PotentialCustomer) {
  const facts = (lead.research?.facts ?? []).filter((fact) => fact.fact && fact.source_url);
  const opener = leadOpener(lead);
  if (opener.fact && opener.source && !facts.some((fact) => fact.fact === opener.fact)) {
    facts.unshift({ fact: opener.fact, source_url: opener.source });
  }
  return facts;
}

/**
 * The saved opening sentence for a language — only while the fact it was
 * written from is still one of the lead's verified facts.
 */
export function savedOpener(lead: PotentialCustomer, language: MessageLanguage) {
  const research = lead.research;
  const text = language === "no" ? research?.opener_no : research?.opener_en;
  if (!text || !research?.opener_fact) return null;
  return verifiedFacts(lead).some((fact) => fact.fact === research.opener_fact) ? text : null;
}

/**
 * The role a lead is advertising for, from a job-ad fact (arbeidsplassen.no),
 * e.g. "Senior utvikler (.NET / C#)". Null when there's no such fact.
 */
export function hiringRole(lead: PotentialCustomer) {
  const fact = verifiedFacts(lead).find((item) => item.source_url.includes("arbeidsplassen.nav.no"));
  const quoted = fact?.fact.match(/“([^”]+)”/)?.[1];
  if (!quoted) return null;
  // "Senior iOS-utvikler | Trondheim Engineering" -> "Senior iOS-utvikler"
  const title = quoted.split(" | ")[0].trim();
  const design = /(design|\bux\b|\bui\b)/i.test(title);
  // Long, salesy ad titles read badly quoted back — describe the role instead.
  const quotable = title.length <= 60 && !/[!?]/.test(title);
  return { title: quotable ? title : null, extracted: quotable ? null : roleFromAdTitle(title), design };
}

function hiringOpening(
  role: NonNullable<ReturnType<typeof hiringRole>>,
  company: string | null,
  language: MessageLanguage
) {
  if (role.title) {
    return language === "no"
      ? `Jeg så stillingsannonsen deres for «${role.title}».`
      : `I saw your job ad for a “${role.title}”.`;
  }
  // A sentence-style ad title: name the role in it, e.g. "senior systemutviklere".
  if (role.extracted) return roleOpening(role.extracted, language);
  // No clear role: name the company, so the opening is still about them.
  const who = company ? displayCompanyName(company) : null;
  return language === "no"
    ? `Jeg så at ${who ?? "dere"} søker ${role.design ? "designere" : "utviklere"} for tiden.`
    : `I saw that ${who ?? "you"} ${who ? "is" : "are"} looking for ${role.design ? "designers" : "developers"} at the moment.`;
}

function hiringQuestion(role: NonNullable<ReturnType<typeof hiringRole>>, language: MessageLanguage) {
  const kind = role.design ? { no: "design- og UX-kapasitet", en: "design and UX capacity" } : null;
  return language === "no"
    ? `Mens dere leter etter rett person – kunne det vært nyttig med ekstra ${kind?.no ?? "utviklingskapasitet"} på prosjektene i mellomtiden?`
    : `While you look for the right person – would extra ${kind?.en ?? "development capacity"} on your projects in the meantime be useful?`;
}

/**
 * The opening sentence, written without AI where possible: the one Claude
 * saved during research, then the job ad, then a verified fact in the
 * message's language, then the register profile. Null leaves it to the
 * caller (a gap to fill by hand, or the plain opening when nothing is known).
 */
export function automaticOpening(lead: PotentialCustomer, language: MessageLanguage) {
  const saved = savedOpener(lead, language);
  if (saved) return saved;
  const role = hiringRole(lead);
  if (role) return hiringOpening(role, lead.company, language);
  for (const fact of verifiedFacts(lead)) {
    const opening = factOpening(fact, language);
    if (opening) return opening;
  }
  return profileOpening(
    {
      company: lead.company || (lead.name !== lead.company ? null : lead.name),
      location: lead.location,
      activity: PLAYBOOKS[leadIndustry(lead)].activity ?? null,
    },
    language
  );
}

function firstName(lead: PotentialCustomer) {
  // "Johannes & Jarle Sjurseike" -> "Johannes"; a company-only lead -> no name.
  if (!lead.name || lead.name === lead.company) return null;
  return lead.name.split(/\s|&/)[0] || null;
}

export function buildMessage(
  kind: MessageKind,
  language: MessageLanguage,
  lead: PotentialCustomer,
  questionIndex = 0
): { subject: string | null; body: string } {
  const playbook = PLAYBOOKS[leadIndustry(lead)];
  const questions = playbook.openingQuestions;
  // A partner lead found through a job ad: open with the ad, ask about the gap.
  const role = leadIndustry(lead) === "agency_partner" ? hiringRole(lead) : null;
  const automatic = automaticOpening(lead, language);
  const question =
    role && questionIndex === 0
      ? hiringQuestion(role, language)
      : questions[questionIndex % questions.length][language];
  // The follow-up asks differently: the next question, or a duplicate-work angle.
  const otherQuestion =
    questions.length > 1
      ? questions[(questionIndex + 1) % questions.length][language]
      : language === "no"
        ? "Hvor i arbeidsflyten tastes den samme informasjonen inn mer enn én gang hos dere?"
        : "Where in your workflow does the same information get typed in more than once?";
  const name = firstName(lead);
  const company = lead.company || lead.name;
  const hasFact = verifiedFacts(lead).length > 0;
  const peers = playbook.peers[language];
  const copy = playbook.copy;
  const subject = copy?.subject[language].replace("{company}", company ?? "");

  if (language === "no") {
    const hi = name ? `Hei ${name}` : "Hei";
    const opening =
      automatic ??
      (hasFact ? OPENER_GAP.no : `Jeg jobber med ${peers}, og tar kontakt for å høre litt om hvordan dere jobber.`);
    switch (kind) {
      case "connection_note":
        return {
          subject: null,
          body: `${hi}! ${copy?.connectionNote.no ?? `Jeg jobber med ${peers} om å forenkle arbeidsflyten mellom felt og kontor. Hadde vært fint å koble seg til.`} – Olga, Enodre`,
        };
      case "follow_up":
        return {
          subject: subject ? `Re: ${subject}` : `Re: arbeidsflyten hos ${company}`,
          body: [
            `Hei igjen${name ? ` ${name}` : ""},`,
            `Jeg sendte deg en kort melding for noen dager siden. Et litt annet spørsmål: ${otherQuestion}`,
            copy?.followUpLine.no ??
              `Det er ofte her dobbeltarbeidet oppstår hos ${peers}. Hvis det ikke er aktuelt, er det helt greit å si fra.`,
            "Olga, Enodre",
          ].join("\n\n"),
        };
      case "final_follow_up":
        return {
          subject: `Siste melding fra meg – ${company}`,
          body: [
            `Hei${name ? ` ${name}` : ""},`,
            "Jeg skal ikke fylle innboksen din, så dette er siste melding fra meg.",
            copy?.finalLine.no ??
              "Hvis det blir aktuelt å forenkle arbeidsflyten mellom felt og kontor senere, er det bare å svare her. Og er det ikke relevant, er et kort «nei takk» helt i orden.",
            "Olga, Enodre",
          ].join("\n\n"),
        };
      case "phone_opener":
        return {
          subject: null,
          body:
            copy?.phoneOpener.no ??
            `Hei, jeg heter Olga fra Enodre. Vi snakker med ${peers} om hvordan informasjonen fra folk ute kommer inn til kontoret. Har du to minutter nå, eller passer det bedre en annen gang?`,
        };
      case "first_message":
      case "email":
        return {
          subject: subject ?? `Spørsmål om arbeidsflyten hos ${company}`,
          body: [
            `${hi},`,
            opening,
            question,
            playbook.value.no,
            "Er du åpen for en kort prat på 5 minutter?",
            "Olga, Enodre",
          ].join("\n\n"),
        };
    }
  }

  const hi = name ? `Hi ${name}` : "Hi";
  const opening =
    automatic ??
    (hasFact ? OPENER_GAP.en : `I work with ${peers}, and I'm getting in touch to learn a little about how you work.`);
  switch (kind) {
    case "connection_note":
      return {
        subject: null,
        body: `${hi}! ${copy?.connectionNote.en ?? `I work with ${peers} on simplifying the workflow between the field and the office. Would be good to connect.`} – Olga, Enodre`,
      };
    case "follow_up":
      return {
        subject: subject ? `Re: ${subject}` : `Re: workflow at ${company}`,
        body: [
          `Hi again${name ? ` ${name}` : ""},`,
          `I sent you a short message a few days ago. A slightly different question: ${otherQuestion}`,
          copy?.followUpLine.en ??
            `That's often where duplicate work creeps in for ${peers}. If it's not relevant, just say so.`,
          "Olga, Enodre",
        ].join("\n\n"),
      };
    case "final_follow_up":
      return {
        subject: `Last message from me – ${company}`,
        body: [
          `Hi${name ? ` ${name}` : ""},`,
          "I don't want to fill your inbox, so this is my last message.",
          copy?.finalLine.en ??
            "If simplifying the workflow between the field and the office becomes relevant later, just reply here. And if it isn't, a short “no thanks” is completely fine.",
          "Olga, Enodre",
        ].join("\n\n"),
      };
    case "phone_opener":
      return {
        subject: null,
        body:
          copy?.phoneOpener.en ??
          `Hi, this is Olga from Enodre. We're talking to ${peers} about how information from people in the field reaches the office. Do you have two minutes now, or is another time better?`,
      };
    case "first_message":
    case "email":
      return {
        subject: subject ?? `Question about the workflow at ${company}`,
        body: [
          `${hi},`,
          opening,
          question,
          playbook.value.en,
          "Would you be open to a quick 5-minute chat?",
          "Olga, Enodre",
        ].join("\n\n"),
      };
  }
}
