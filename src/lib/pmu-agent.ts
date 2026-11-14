// The PMU job agent: clinics and agencies to contact, your licence progress,
// and the messages. Pure, so it's unit-tested; the page does the I/O.

export const PMU_KIND_VALUES = ["clinic", "salon", "studio", "academy", "agency"] as const;
export type PmuKind = (typeof PMU_KIND_VALUES)[number];
export const pmuKindLabels: Record<PmuKind, string> = {
  clinic: "Medical clinic",
  salon: "Salon",
  studio: "PMU studio",
  academy: "Academy",
  agency: "Recruiter",
};

// The stages, in order; the last three end the conversation.
export const PMU_STATUS_VALUES = [
  "to_contact",
  "contacted",
  "followed_up",
  "replied",
  "interview",
  "trial",
  "offer",
  "accepted",
  "not_now",
  "declined",
  "not_relevant",
] as const;
export type PmuStatus = (typeof PMU_STATUS_VALUES)[number];
export const pmuStatusLabels: Record<PmuStatus, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  followed_up: "Followed up",
  replied: "Replied",
  interview: "Call",
  trial: "Visit / trial",
  offer: "Offer",
  accepted: "Accepted",
  not_now: "Not now",
  declined: "Declined",
  not_relevant: "Not relevant",
};

export type PmuTarget = {
  id: string;
  kind: PmuKind;
  name: string;
  city: string;
  country: string;
  website: string | null;
  instagram: string | null;
  whatsapp: string | null;
  email: string | null;
  services: string | null;
  pay_score: number;
  pay_note: string | null;
  fit: "high" | "medium" | "low";
  source_url: string | null;
  notes: string | null;
  status: PmuStatus;
  last_contacted_on: string | null;
  // Your own next step, overriding the suggested one (missing until pmu_agent.sql has run again).
  /** Removed from the list by you (missing until pmu_agent.sql has run again). */
  hidden?: boolean;
  /** Marked as a favourite: shown first, in the green section. */
  favourite?: boolean;
  next_action?: string | null;
  next_action_on?: string | null;
  offer?: PmuOffer | null;
  // From the daily search (missing until pmu_agent.sql has run again).
  source?: string;
  discovered_at?: string | null;
  reviews?: number | null;
  team_size?: number | null;
};

export type PmuProfile = Record<string, string>;

/** What an offer says, to compare offers side by side. */
export type PmuOffer = {
  salary?: string;
  commission?: string;
  housing?: string;
  visa?: string;
  flights?: string;
  insurance?: string;
  start?: string;
  notes?: string;
};

export const PMU_PORTFOLIO = {
  instagram: "https://www.instagram.com/beautysecretsbyolga",
  facebook: "https://www.facebook.com/VippeExtensionsBergen/photos",
};

const greeting = (target: PmuTarget) => `Hello ${target.name} team,`;

const lipsAndBrows = "brows, lips and eyeliner, plus scalp and areola micropigmentation";

function reason(target: PmuTarget) {
  switch (target.kind) {
    case "clinic":
      return "I'm writing because you offer medical micropigmentation, and that's the work I'm proudest of: areola, brow restoration and scalp pigmentation for clients after hair loss and cancer treatment, which I did for six years at TBL Medical, a medical aesthetics clinic in Norway.";
    case "academy":
      return "I'm writing because you train artists as well as treat clients, and after 14 years and more than 4,000 clients I'd love to do both.";
    case "agency":
      return "I'm looking for a senior permanent makeup or micropigmentation role, ideally in a medical clinic or a premium studio, and I'm happy to relocate.";
    default:
      return "I'm writing because your PMU menu is exactly the work I do every day, and I'd love to bring my experience to your team.";
  }
}

/** A short first message for WhatsApp or Instagram. */
export function pmuShortMessage(target: PmuTarget, profile: PmuProfile) {
  return [
    greeting(target),
    `I'm Olga Goryszewska, a senior PMU artist with 14 years and 4,000+ clients: ${lipsAndBrows}. ${reason(target)}`,
    `Healed results: ${profile.portfolio_instagram || PMU_PORTFOLIO.instagram}`,
    target.country === "Spain" || target.country === "Portugal"
      ? "I speak English, Norwegian and Polish, so I can look after your British and Scandinavian clients in their own language."
      : null,
    `Are you hiring, or open to a short call? I can start from ${profile.available_from || "December 2026"}, full-time, and I'm happy to relocate.`,
    "Olga",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** The longer version, for email or a careers form. */
export function pmuEmail(target: PmuTarget, profile: PmuProfile) {
  const medical =
    target.kind === "clinic"
      ? "In the clinic I worked within medical standards for consultation, hygiene and aftercare, and I'm comfortable working alongside doctors."
      : "I ran my own studio in Bergen for 13 years, so I also know the business side: treatment protocols, touch-up schedules, before-and-after content and repeat bookings.";
  return {
    subject: "Senior PMU artist – brows, lips, medical micropigmentation",
    body: [
      greeting(target),
      `I'm Olga Goryszewska, a senior semi-permanent makeup artist with 14 years of experience and more than 4,000 clients. ${reason(target)}`,
      `I specialise in natural results that heal evenly: soft powder and combi brows, microblading, lip blush and powder lips, eyeliner, and scalp, scar and areola micropigmentation. I trained with PhiBrows, Biotek and the Natural Permanent Makeup Academy, and I hold a bachelor's degree in Public Health.`,
      medical,
      "I speak English, Norwegian and Polish, so I can look after British and Scandinavian clients in their own language.",
      `My portfolio of healed results is on Instagram (${profile.portfolio_instagram || PMU_PORTFOLIO.instagram}) and Facebook (${
        profile.portfolio_facebook || PMU_PORTFOLIO.facebook
      }). My CV is attached.`,
      `I can start from ${profile.available_from || "December 2026"}, full-time, and I'm happy to relocate. Would you be open to a short call?`,
      "Best regards,\nOlga Goryszewska\n+47 483 38 779 (WhatsApp) · olga.goryszewska@gmail.com",
    ].join("\n\n"),
  };
}

/** wa.me link with the message filled in, or null without a number. */
export function whatsappLink(phone: string | null, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function instagramLink(handle: string | null) {
  const clean = (handle ?? "")
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/\/.*$/, "");
  return clean ? `https://www.instagram.com/${clean}` : null;
}

export function mailtoLink(email: string | null, subject: string, body: string) {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Best pay first, then best fit, then name. */
export function byPay(targets: PmuTarget[]) {
  const fit = { high: 0, medium: 1, low: 2 };
  return [...targets].sort(
    (a, b) => b.pay_score - a.pay_score || fit[a.fit] - fit[b.fit] || a.name.localeCompare(b.name)
  );
}

// What the research found on pay, best first. Ranges are thin: always ask.
export const PAY_GUIDE: { market: string; pay: string; note: string }[] = [
  {
    market: "Norway, self-employed",
    pay: "NOK 4,000–6,000 per treatment",
    note: "Room in an approved clinic; likely the best earnings",
  },
  {
    market: "Spain, salaried",
    pay: "€1,500–2,500 gross / month",
    note: "Few openings; a room or partnership in a premium clinic usually pays more",
  },
  {
    market: "Spain, premium coast (Marbella, Mallorca, Costa Blanca)",
    pay: "Ask for commission",
    note: "Higher treatment prices and Scandinavian and British clients",
  },
  {
    market: "Portugal",
    pay: "Below Spain",
    note: "No reliable salary found; Lisbon lip blush from about €150. Ask every clinic",
  },
  { market: "USA (contract)", pay: "$60–80k / year", note: "One Texas contract listing; average PMU pay much lower" },
];

// To ask every employer before saying yes (from the research's negotiation gaps).
export const NEGOTIATION_CHECKLIST = [
  "Basic salary, and the commission percentage on each treatment",
  "A guaranteed minimum for the first months while you build clients",
  "Contract type: employed, self-employed (autónomo / trabalhador independente) or room rental",
  "Who pays for the regional hygiene and sanitation course and the clinic's permit",
  "Health insurance",
  "Housing or housing allowance, and transport",
  "Flight at the start and a yearly ticket home",
  "Products and pigments provided (PhiBrows or your choice)",
  "Working hours, days off, and whether trial days are paid",
  "Notice period and any non-compete clause",
];

// Never accept these.
export const RED_FLAGS = [
  "Any fee asked of you: visa, training, placement or equipment",
  "Work on a visit or tourist visa",
  "Your own visa or a spouse's sponsorship required",
  "Commission only, or unpaid trial days",
  "Passport or bank details asked for before a written offer",
];
