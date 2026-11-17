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

// "Clínica X – Dr. Y" greets the clinic; a doctor's own practice greets the doctor.
function greeting(target: PmuTarget) {
  const name = target.name.split(/\s[–-]\s/)[0].trim();
  return /^dra?\.\s/i.test(name) ? `Hello ${name},` : `Hello ${name} team,`;
}

// How she can work with them: freelance first, so it reads as an offer, not a job hunt.
const WAYS_TO_WORK =
  "I'm flexible on how we work together: freelance on set days or a permanent role, whatever suits you best.";

function reason(target: PmuTarget) {
  switch (target.kind) {
    case "clinic":
      return "I'd love to work with a clinic like yours. Natural semi-permanent brows, lips and eyeliner sit well alongside aesthetic treatments, and I also do the medical side: brow restoration after hair loss, areola pigmentation after breast surgery, and scar camouflage.";
    case "academy":
      return "I'd love to treat clients with you and help train new artists.";
    case "agency":
      return "I'm looking for PMU work with a medical aesthetic clinic or a premium studio, freelance or employed.";
    default:
      return "Your PMU menu is exactly the work I do every day, and I'd love to help you with it.";
  }
}

const languages = (target: PmuTarget) =>
  target.country === "Spain" || target.country === "Portugal"
    ? "I speak English, Norwegian and Polish, which helps with international clients."
    : null;

/** A short first message for WhatsApp or Instagram: friendly, no hard ask. */
export function pmuShortMessage(target: PmuTarget, profile: PmuProfile) {
  return [
    greeting(target),
    "I'm Olga, a PMU and medical micropigmentation artist with 14 years of experience, six of them at TBL Medical, a medical aesthetics clinic in Norway.",
    reason(target),
    WAYS_TO_WORK,
    languages(target),
    `Some of my healed results: ${profile.portfolio_instagram || PMU_PORTFOLIO.instagram}`,
    "Would you be open to a short call? I'm happy to fit around your schedule.",
    "Best wishes,\nOlga",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** The longer version, for email or a careers form. */
export function pmuEmail(target: PmuTarget, profile: PmuProfile) {
  const background =
    target.kind === "clinic"
      ? "For six years I worked at TBL Medical, a medical aesthetics clinic in Bergen, alongside doctors and to medical standards for consultation, hygiene and aftercare. I also ran my own studio for 13 years, so I can set the whole service up: treatment protocols, touch-up schedules, pricing and before-and-after content."
      : "I ran my own studio in Bergen for 13 years and worked six years at TBL Medical, a medical aesthetics clinic, so I know both the treatments and the business side: protocols, touch-ups, pricing and repeat bookings.";
  return {
    subject: `PMU and medical micropigmentation – working with ${target.name}`,
    body: [
      greeting(target),
      `I'm Olga Goryszewska, a semi-permanent makeup and medical micropigmentation artist with 14 years of experience and more than 4,000 clients. ${reason(target)}`,
      background,
      "I trained with PhiBrows, Biotek and the Natural Permanent Makeup Academy, and I hold a bachelor's degree in Public Health, specialising in cosmetology and wellness.",
      WAYS_TO_WORK,
      languages(target),
      `My healed results are on Instagram (${profile.portfolio_instagram || PMU_PORTFOLIO.instagram}), and my portfolio is attached.`,
      "Would you be open to a short call? I'm happy to fit around your schedule, and I can also visit the clinic.",
      "Best regards,\nOlga Goryszewska\n+47 483 38 779 (WhatsApp) · olga.goryszewska@gmail.com",
    ]
      .filter(Boolean)
      .join("\n\n"),
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
    note: "Freelance in an approved clinic; likely the best earnings",
  },
  {
    market: "Spain, salaried",
    pay: "€1,500–2,500 gross / month",
    note: "Few openings; freelance or a partnership in a premium clinic usually pays more",
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
  "Contract type: employed, self-employed (autónomo / trabalhador independente)",
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
