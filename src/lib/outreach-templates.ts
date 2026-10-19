import type { PotentialCustomer } from "@/lib/potential-customer";

// Message templates for the composer. They follow the GTM plan's rules: about
// them, the pain as a QUESTION, one plain sentence on the solution, a small
// ask, no product names. The opener (sentence 1) is always written by hand
// from the lead's researched fact — the template leaves a marked gap for it.

export const MESSAGE_KIND_VALUES = ["connection_note", "first_message", "email", "follow_up", "phone_opener"] as const;
export type MessageKind = (typeof MESSAGE_KIND_VALUES)[number];

export const messageKindLabels: Record<MessageKind, string> = {
  connection_note: "LinkedIn connection note",
  first_message: "First message",
  email: "Email",
  follow_up: "Follow-up",
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

// Kinds that can be sent straight from the composer by email.
export const EMAILABLE_KINDS: readonly MessageKind[] = ["first_message", "email", "follow_up"];

// LinkedIn's limit for a note on a connection request.
export const CONNECTION_NOTE_MAX = 300;

export const OPENER_GAP = { no: "[Én konkret, sann ting om dem]", en: "[One specific, true thing about them]" };

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
};

/** The channel a message kind is usually sent through — editable in the composer. */
export function defaultChannel(kind: MessageKind, lead: PotentialCustomer): MessageChannel {
  if (kind === "email") return "email";
  if (kind === "phone_opener") return "phone";
  if (kind === "connection_note") return "linkedin";
  if (lead.best_channel === "email") return "email";
  if (lead.best_channel === "contact_form") return "contact_form";
  return "linkedin";
}

// Segment F (fuel, generators, equipment service) talks about deliveries and
// service visits and may mention the similar system we built — but never by
// name and never with customer results (it has no paying customers yet).
type Wording = { pain: string; peers: string; cost: string; solution: string; reference: string | null };

const WORDING: Record<MessageLanguage, { field: Wording; fuel: Wording }> = {
  no: {
    field: {
      pain: "får dere timer, materiell og utført arbeid fra folka ute og over på fakturaen i dag",
      peers: "bedrifter med mange oppdrag ute",
      cost: "timer på SMS, lister som må sjekkes, og faktura som går ut for sent – eller ikke i det hele tatt",
      solution:
        "det folka registrerer ute på jobben går rett til fakturautkast i regnskapssystemet dere allerede bruker, uten manuell punching",
      reference: null,
    },
    fuel: {
      pain: "blir leveranser, påfyllinger og servicebesøk dokumentert og fakturert hos dere i dag",
      peers: "drivstoff- og utstyrsbedrifter",
      cost: "dokumentasjon som tas for hånd, rapporter som tar tid å sette sammen, og faktura som går ut for sent",
      solution:
        "hver leveranse eller hvert besøk registreres med GPS, tidspunkt og bilde, og blir til rapport og fakturautkast i systemene dere allerede har",
      reference: "Vi har bygget et lignende system for drivstofflevering og aggregatdrift.",
    },
  },
  en: {
    field: {
      pain: "do hours, materials and finished work get from your people in the field onto the invoice today",
      peers: "companies with lots of field jobs",
      cost: "hours sent by text, lists to check, and invoices that go out late – or not at all",
      solution:
        "what your people register on the job goes straight into draft invoices in the accounting system you already use, with no manual re-typing",
      reference: null,
    },
    fuel: {
      pain: "are deliveries, refuels and service visits documented and invoiced today",
      peers: "fuel and equipment companies",
      cost: "documentation done by hand, reports that take time to put together, and invoices that go out late",
      solution:
        "every delivery or visit is logged with GPS, timestamp and photo, and becomes a report and a draft invoice in the systems you already have",
      reference: "We've built a similar system for fuel delivery and generator operations.",
    },
  },
};

function firstName(lead: PotentialCustomer) {
  // "Johannes & Jarle Sjurseike" -> "Johannes"; a company-only lead -> no name.
  if (!lead.name || lead.name === lead.company) return null;
  return lead.name.split(/\s|&/)[0] || null;
}

export function buildMessage(
  kind: MessageKind,
  language: MessageLanguage,
  lead: PotentialCustomer
): { subject: string | null; body: string } {
  const w = WORDING[language][lead.segment === "F" ? "fuel" : "field"];
  const name = firstName(lead);
  const company = lead.company || lead.name;
  const opener = OPENER_GAP[language];

  if (language === "no") {
    const hi = name ? `Hei ${name}` : "Hei";
    switch (kind) {
      case "connection_note":
        return {
          subject: null,
          body: `${hi}! Jeg hjelper ${w.peers} å få ferdig arbeid over til faktura uten manuell punching. Hadde vært fint å koble seg til. – Olga, Enodre`,
        };
      case "follow_up":
        return {
          subject: `Oppfølging: fakturering hos ${company}`,
          body: `Hei igjen${name ? ` ${name}` : ""} – bare en rask påminnelse i tilfelle meldingen druknet. 15 minutter, når det passer deg. Ingen salg.\n\nOlga, Enodre`,
        };
      case "phone_opener":
        return {
          subject: null,
          body: `Hei, jeg heter Olga fra Enodre. Vi snakker med ${w.peers} om hvordan de håndterer fakturering etter ferdige jobber. Har du to minutter nå, eller kan jeg ringe tilbake når det passer bedre?`,
        };
      case "first_message":
      case "email":
        return {
          subject: `Kort spørsmål om fakturering hos ${company}`,
          body: [
            `${hi},`,
            opener,
            `Hvordan ${w.pain}?`,
            `Hos mange ${w.peers} er det her tiden forsvinner: ${w.cost}.`,
            [`Vi setter opp løsninger der ${w.solution}.`, w.reference].filter(Boolean).join(" "),
            "Har du 15 minutter en dag neste uke? Jeg vil gjerne høre hvordan dere gjør det i dag.",
            "Olga, Enodre",
          ].join("\n\n"),
        };
    }
  }

  const hi = name ? `Hi ${name}` : "Hi";
  switch (kind) {
    case "connection_note":
      return {
        subject: null,
        body: `${hi}! I help ${w.peers} get finished work onto the invoice without manual re-typing. Would be good to connect. – Olga, Enodre`,
      };
    case "follow_up":
      return {
        subject: `Following up: invoicing at ${company}`,
        body: `Hi again${name ? ` ${name}` : ""} – just a quick nudge in case my message got buried. 15 minutes, whenever suits you. No sales.\n\nOlga, Enodre`,
      };
    case "phone_opener":
      return {
        subject: null,
        body: `Hi, this is Olga from Enodre. We're talking to ${w.peers} about how they handle invoicing after finished jobs. Do you have two minutes now, or can I call back at a better time?`,
      };
    case "first_message":
    case "email":
      return {
        subject: `Quick question about invoicing at ${company}`,
        body: [
          `${hi},`,
          opener,
          `How ${w.pain}?`,
          `For many ${w.peers}, this is where the time goes: ${w.cost}.`,
          [`We set up systems where ${w.solution}.`, w.reference].filter(Boolean).join(" "),
          "Do you have 15 minutes one day next week? I'd like to hear how you do it today.",
          "Olga, Enodre",
        ].join("\n\n"),
      };
  }
}
