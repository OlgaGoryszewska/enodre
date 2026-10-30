// Job agent: scores a job ad against Olga's CV, places it in one of the
// target cities, and writes the cover letter. Rule-based — free, instant and
// predictable. Pure, no imports (unit-tested).

export const TARGET_CITIES = ["Oslo", "Warsaw", "Colombo", "Dubai", "Riyadh", "Spain", "Remote"] as const;
export type TargetCity = (typeof TARGET_CITIES)[number];

const CITY_PATTERNS: [TargetCity, RegExp][] = [
  ["Oslo", /\boslo\b/i],
  ["Warsaw", /\b(warszawa|warsaw|warschau)\b/i],
  ["Colombo", /\bcolombo\b/i],
  ["Dubai", /\b(dubai|dubaj)\b/i],
  ["Riyadh", /\b(riyadh|riyad|rijad|ar-riyad)\b/i],
  // Spain as a whole country: any of its main tech cities, or the country name.
  [
    "Spain",
    /\b(spain|españa|espana|madrid|barcelona|valencia|sevilla|seville|málaga|malaga|bilbao|zaragoza|alicante|palma|las palmas|tenerife)\b/i,
  ],
  ["Remote", /\b(remote|hjemmekontor|fully distributed|work from anywhere|zdalnie|zdalna)\b/i],
];

/** The target city a location belongs to, or null if it's none of them. */
export function cityOf(location: string): TargetCity | null {
  for (const [city, pattern] of CITY_PATTERNS) if (pattern.test(location)) return city;
  return null;
}

// The role must be ours: developer / engineer / UX / product designer work.
const ROLE =
  /(developer|utvikler|programmer|programmerer|software engineer|frontend|front-end|backend|back-end|full[ -]?stack|web engineer|mobile engineer|product engineer|react|next\.?js|typescript|javascript|ux|ui designer|product designer|interaction designer|tjenestedesigner|produktdesigner|programista)/i;
// Roles that share words with ours but aren't our work.
const REJECT =
  /(plc|automasjon|automation engineer|embedded|firmware|hardware|electrical|elektro|mechanical|mekanisk|sap\b|salesforce|dynamics 365|mainframe|cobol|nurse|sykepleier|recruiter|sourcer|sales|selger|account manager|teacher|lærer|data scientist|machine learning researcher|game developer|unity|unreal|blockchain|solidity|qa tester|support engineer|helpdesk)/i;
// Far more senior than 3+ years.
const TOO_SENIOR = /(principal|staff engineer|head of|director|vp of|chief|cto|10\+ years|8\+ years)/i;

// Skills from the CV, weighted by how central they are.
const SKILLS: [string, RegExp, number][] = [
  ["React", /\breact(\.js|js)?\b(?!\s*native)/i, 16],
  ["Next.js", /\bnext\.?js\b/i, 16],
  ["TypeScript", /\btypescript\b/i, 12],
  ["React Native", /\breact[ -]native\b/i, 12],
  ["Expo", /\bexpo\b/i, 5],
  ["JavaScript", /\bjavascript\b|\bjs\b/i, 6],
  ["Node.js", /\bnode(\.?js)?\b/i, 8],
  ["Supabase", /\bsupabase\b/i, 10],
  ["PostgreSQL", /\bpostgres(ql)?\b/i, 8],
  ["Tailwind", /\btailwind\b/i, 4],
  ["PWA", /\b(pwa|progressive web app|service workers?)\b/i, 4],
  ["REST/GraphQL", /\b(rest(ful)? api|graphql)\b/i, 4],
  ["Full stack", /\bfull[ -]?stack\b/i, 10],
  ["Frontend", /\b(frontend|front-end)\b/i, 8],
  ["UX", /\b(ux|user experience|ux research|interaction design)\b/i, 8],
  ["Figma", /\bfigma\b/i, 6],
  ["Product engineer", /\bproduct engineer\b/i, 8],
  ["AWS/Vercel", /\b(aws|vercel)\b/i, 3],
];

export type JobInput = { title: string; text: string };
export type JobScore = { score: number; matched: string[]; rejected: string | null };

/** 0–100: how well an ad fits the CV, with the skills it matched — or why it's out. */
export function scoreJob(job: JobInput): JobScore {
  const all = `${job.title}\n${job.text}`;
  if (!ROLE.test(job.title)) return { score: 0, matched: [], rejected: "Not a developer/UX role" };
  if (REJECT.test(job.title)) return { score: 0, matched: [], rejected: "Different specialism" };
  const matched = SKILLS.filter(([, pattern]) => pattern.test(all)).map(([name]) => name);
  let score = SKILLS.filter(([, pattern]) => pattern.test(all)).reduce((sum, [, , weight]) => sum + weight, 0);
  // A skill in the title counts double — it's what the role is about.
  score += SKILLS.filter(([, pattern]) => pattern.test(job.title)).reduce((sum, [, , weight]) => sum + weight, 0);
  if (TOO_SENIOR.test(job.title)) score -= 25;
  return { score: Math.max(0, Math.min(100, score)), matched, rejected: null };
}

const SPANISH_WORDS =
  /\b(de|la|el|los|las|que|y|para|con|una|un|del|experiencia|empresa|buscamos|ofrecemos|requisitos|puesto)\b/gi;
const ENGLISH_WORDS = /\b(the|and|we|you|with|for|experience|role|team|our|will|are|is)\b/gi;
// Spanish as a requirement — not "Spanish is a plus".
const SPANISH_REQUIRED =
  /(spanish|español|espanol|castellano)[^.]{0,40}\b(required|mandatory|must|essential|fluent|native|nativo|fluido|imprescindible|obligatorio|c1|c2)\b|\b(fluent|native|business[- ]level|professional)\b[^.]{0,20}\b(spanish|español|castellano)\b|(imprescindible|nivel alto de)\s+(español|castellano)/i;

/**
 * For Spain: only English-speaking, international roles. Null when the ad
 * fits; otherwise why it doesn't (written in Spanish, or Spanish required).
 */
export function notEnglishFriendly(text: string): string | null {
  const spanish = (text.match(SPANISH_WORDS) ?? []).length;
  const english = (text.match(ENGLISH_WORDS) ?? []).length;
  if (spanish > english) return "Ad written in Spanish";
  if (SPANISH_REQUIRED.test(text)) return "Spanish required";
  return null;
}

/** Norwegian ad -> Norwegian letter; everything else in English. */
export function adLanguage(text: string): "no" | "en" {
  const norwegian = (text.match(/\b(og|vi|du|deg|som|med|til|har|ikke|stilling|søker|erfaring)\b/gi) ?? []).length;
  const english = (text.match(/\b(and|we|you|the|with|for|experience|role|team)\b/gi) ?? []).length;
  return norwegian > english ? "no" : "en";
}

/**
 * An email address the ad asks applications to be sent to ("Send søknad og
 * CV til …", "Apply by sending your CV to …"). Contact persons for questions
 * don't count — only an explicit instruction to apply by email.
 */
export function applicationEmail(text: string): string | null {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ");
  const apply =
    /(send(e|es)?\s+(din\s+|oss\s+)?(søknad|cv)|søknad(en)?\b[^.]{0,40}\bsendes|apply\s+(by\s+)?(sending|emailing)|send\s+(us\s+)?(your\s+)?(cv|resume|application))/i;
  for (const match of plain.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    const before = plain.slice(Math.max(0, (match.index ?? 0) - 120), match.index);
    // The instruction must come in the same sentence, right before the address.
    const sentence = before.split(/[.!?\n]\s/).at(-1) ?? "";
    if (apply.test(sentence)) return match[0].toLowerCase();
  }
  return null;
}

const CV_HIGHLIGHT = {
  no: "Jeg har 3+ års erfaring med å bygge web- og mobilprodukter fra idé til drift – sist FuelFlo, en plattform for feltoperasjoner med Next.js-portal, offline PWA og React Native-app på en felles Supabase/PostgreSQL-backend.",
  en: "I have 3+ years of experience building web and mobile products from idea to production – most recently FuelFlo, a field-operations platform with a Next.js portal, an offline PWA and a React Native app on a shared Supabase/PostgreSQL backend.",
};

/** A short, specific cover letter for one ad. */
export function coverLetter(input: {
  title: string;
  company: string | null;
  matched: string[];
  language: "no" | "en";
}) {
  const skills = input.matched.slice(0, 4);
  const skillList =
    skills.length > 1
      ? `${skills.slice(0, -1).join(", ")} ${input.language === "no" ? "og" : "and"} ${skills.at(-1)}`
      : skills[0];
  if (input.language === "no") {
    return [
      "Hei,",
      `Jeg søker på stillingen som ${input.title}${input.company ? ` hos ${input.company}` : ""}.`,
      CV_HIGHLIGHT.no,
      skillList
        ? `Jeg jobber daglig med ${skillList}, og liker best å eie hele løpet – fra UX og arkitektur til utvikling og lansering.`
        : "Jeg liker best å eie hele løpet – fra UX og arkitektur til utvikling og lansering.",
      "CV-en min ligger vedlagt, og porteføljen finner du på enodre.com og github.com/OlgaGoryszewska. Jeg tar gjerne en prat.",
      "Med vennlig hilsen\nOlga Goryszewska\n+47 483 38 779",
    ].join("\n\n");
  }
  return [
    "Hello,",
    `I'm applying for the ${input.title} role${input.company ? ` at ${input.company}` : ""}.`,
    CV_HIGHLIGHT.en,
    skillList
      ? `I work with ${skillList} every day, and I'm at my best owning the whole journey – from UX and architecture to development and launch.`
      : "I'm at my best owning the whole journey – from UX and architecture to development and launch.",
    "My CV is attached, and you'll find my portfolio at enodre.com and github.com/OlgaGoryszewska. I'd be glad to talk.",
    "Best regards,\nOlga Goryszewska\n+47 483 38 779",
  ].join("\n\n");
}

/** An open application to an agency or consultancy that hasn't advertised a role. */
export function openApplication(company: string) {
  return {
    subject: "Åpen søknad – fullstack-utvikler og produktutvikler (React, Next.js, React Native)",
    body: [
      "Hei,",
      `Jeg sender en åpen søknad til ${company}, i tilfelle dere trenger en fullstack-utvikler eller produktutvikler nå eller fremover – fast, på prosjekt eller som konsulent.`,
      CV_HIGHLIGHT.no,
      "Jeg jobber med React, Next.js, TypeScript, React Native, Node.js og Supabase/PostgreSQL, og har bakgrunn i UX (Figma, brukertesting).",
      "CV-en min ligger vedlagt, og porteføljen finner du på enodre.com. Passer det med en kort prat?",
      "Med vennlig hilsen\nOlga Goryszewska\n+47 483 38 779 · linkedin.com/in/olga-goryszewska",
    ].join("\n\n"),
  };
}
