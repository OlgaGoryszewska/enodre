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
// HealthTech/BeautyTech roles where clinic experience is the edge. These count
// only at a health or beauty company (DOMAIN) — "customer success" alone is too broad.
export const DOMAIN_ROLE =
  /(product specialist|produktspesialist|product manager|product operations|product ops|implementation|implementering|onboarding specialist|solutions? (consultant|specialist)|application specialist|applikasjonsspesialist|customer success|kundesuksess|customer experience|clinical systems|business analyst|digital (product|solutions) specialist|project coordinator)/i;
const DOMAIN =
  /(health|medtech|medical|clinic|clinical|patient|hospital|helse|pasient|sykehus|klinikk|aesthetic|beauty|skincare|skin care|cosmetic|dermatolog|medspa|\bsalon\b|wellness|doctolib|doctoralia|docplanner|dignio|pabau|clinicminds|nextmotion|fresha|booksy|treatwell|phorest|zenoti|haut\.ai)/i;
// Staff perks mention health too — they say nothing about the company.
const PERKS =
  /(private |medical |dental |mental )?(health|healthcare|medical)[ -]?(insurance|care|benefits?|cover(age)?|plan|allowance|stipend)|(wellness|wellbeing)[ -]?(stipend|allowance|programs?|benefits?|budget)/gi;
// Roles that share words with ours but aren't our work.
const REJECT =
  /(plc|automasjon|automation engineer|embedded|firmware|hardware|electrical|elektro|mechanical|mekanisk|sap\b|salesforce|dynamics 365|mainframe|cobol|nurse|sykepleier|recruiter|sourcer|sales|selger|account manager|teacher|lærer|data scientist|machine learning researcher|game developer|unity|unreal|blockchain|solidity|qa tester|support engineer|helpdesk)/i;
// Far more senior than 3+ years.
// Three years of hands-on project experience, not corporate seniority:
// senior/lead titles and ads asking for 5+ years are out.
const SENIOR_TITLE =
  /\b(senior|sr\.?|seniorutvikler|lead|tech lead|team lead|principal|staff|head of|director|vp|chief|cto|architect|arkitekt|engineering manager|it manager|leder)\b/i;
const YEARS_REQUIRED =
  /\b(?:minimum|min\.?|at least|minst|over)?\s*([5-9]|1\d)\s*\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs|års?|lat)\b[^.]{0,40}\b(?:experience|erfaring|doświadczenia|of professional|in software|as a)/i;
// Mid-level and junior-friendly wording is a small plus.
const MID_LEVEL = /\b(junior|mid|mid-level|medior|intermediate|regular|2\+ years|3\+ years|2-4 years|3-5 years)\b/i;

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

/** For hiring posts: does the text name a role we'd apply for, without a senior-only ask? */
export function mentionsOurRole(text: string) {
  return (ROLE.test(text) || DOMAIN_ROLE.test(text)) && !SENIOR_TITLE.test(text.slice(0, 200));
}

export type JobInput = { title: string; text: string };
export type JobScore = { score: number; matched: string[]; rejected: string | null };

/** 0–100: how well an ad fits the CV, with the skills it matched — or why it's out. */
export function scoreJob(job: JobInput): JobScore {
  const all = `${job.title}\n${job.text}`;
  const domainRole = DOMAIN_ROLE.test(job.title);
  const domain = DOMAIN.test(all.replace(PERKS, " "));
  if (!ROLE.test(job.title) && !domainRole) return { score: 0, matched: [], rejected: "Not a developer/UX role" };
  if (domainRole && !ROLE.test(job.title) && !domain) {
    return { score: 0, matched: [], rejected: "Not a health or beauty company" };
  }
  if (REJECT.test(job.title)) return { score: 0, matched: [], rejected: "Different specialism" };
  if (SENIOR_TITLE.test(job.title)) return { score: 0, matched: [], rejected: "Senior or lead role" };
  if (YEARS_REQUIRED.test(job.text)) return { score: 0, matched: [], rejected: "Asks for 5+ years" };
  const matched = SKILLS.filter(([, pattern]) => pattern.test(all)).map(([name]) => name);
  let score = SKILLS.filter(([, pattern]) => pattern.test(all)).reduce((sum, [, , weight]) => sum + weight, 0);
  // A skill in the title counts double — it's what the role is about.
  score += SKILLS.filter(([, pattern]) => pattern.test(job.title)).reduce((sum, [, , weight]) => sum + weight, 0);
  if (MID_LEVEL.test(all)) score += 8;
  // Health or beauty is where your background counts most.
  if (domain) {
    score += domainRole ? 45 : 20;
    matched.unshift("Health/beauty");
  }
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

const BACKGROUND_LINE = {
  no: "Før det eide og drev jeg en klinikk for medisinsk mikropigmentering i 13 år, i samarbeid med medisinske og estetiske klinikker, og jeg har en bachelorgrad i folkehelse. Derfor forstår jeg både forretningen og menneskene som bruker produktene.",
  en: "Before that I owned and ran a medical micropigmentation clinic for 13 years, collaborating with medical and aesthetic clinics, and I hold a bachelor's degree in Public Health. So I understand both the business and the people using the products.",
};

// Short version, for open applications.
const CV_HIGHLIGHT = {
  no: "Jeg har tre års praktisk erfaring fra egne prosjekter, der jeg har bygget web- og mobilprodukter fra idé til drift – som frilansutvikler og som eneste utvikler bak FuelFlo, en plattform for feltoperasjoner med Next.js-portal, offline PWA og React Native-app på en felles Supabase/PostgreSQL-backend.",
  en: "I have three years of hands-on project experience building web and mobile products from idea to production – as a freelance developer and as the sole builder of FuelFlo, a field-operations platform with a Next.js portal, an offline PWA and a React Native app on a shared Supabase/PostgreSQL backend.",
};

type LetterInput = {
  title: string;
  company: string | null;
  matched: string[];
  language: "no" | "en";
};

const FUELFLO_STORY = {
  no: "Prosjektet jeg er mest stolt av er FuelFlo. Jeg bygget det fra start til slutt, helt alene, for drivstoffteknikere som jobber på arrangementer og byggeprosjekter, ofte uten dekning og uten tålmodighet for tungvint programvare. Det ble en Next.js-portal, en offline-først PWA, en React Native-app for iOS og Android, og en Supabase/PostgreSQL-backend som holder alles data synkronisert når de er tilbake på nett. Det jeg likte best var å designe det slik at en tekniker kan logge en levering på sekunder i stedet for å fylle ut papirskjemaer.",
  en: "The project I'm proudest of is FuelFlo. I built it end to end, on my own, for fuel technicians who work at event sites and construction projects, often with no signal and no patience for clunky software. It became a Next.js operations portal, an offline-first PWA, a React Native app for iOS and Android, and a Supabase/PostgreSQL backend that keeps everyone's data in sync when they get back online. Designing it so a technician can log a delivery in seconds, instead of filling in paper forms, was the part I loved most.",
};

const CLINIC_STORY = {
  no: "Før teknologien eide og drev jeg en klinikk for medisinsk mikropigmentering i 13 år, og samarbeidet med medisinske og estetiske klinikker. Jeg var i kontakt med kunder hver eneste dag, og det ga meg ferdigheter jeg fortsatt bruker: å lytte nøye, forklare ting tydelig, avklare forventninger og holde roen når ting blir kompliserte. Med en bachelorgrad i folkehelse i bunnen var det også dette som førte meg til UX og frontend-utvikling hos Noroff, for folk bryr seg ikke om hvor smart et system er, de bryr seg om det gjør dagen deres enklere.",
  en: "Before tech, I spent 13 years owning and running a medical micropigmentation clinic and collaborating with medical and aesthetic clinics, in contact with clients every single day. That career gave me skills I still use all the time: listening carefully, explaining things clearly, managing expectations, and staying calm when things get complicated. Together with my bachelor's degree in Public Health, it's also what pulled me into UX and frontend development at Noroff, because people don't care how clever a system is, they care whether it makes their day easier.",
};

const TEAM_STORY = {
  no: "I et team er jeg den som stiller spørsmålene tidlig, deler fremdrift åpent og passer på at designere, utviklere og interessenter snakker om det samme. Jeg liker å samarbeide tett, gi og få ærlige tilbakemeldinger og hjelpe andre å vokse, noe jeg gjorde som mentor hos Noroff.",
  en: "In a team, I'm the person who asks the questions early, shares progress openly and makes sure designers, developers and stakeholders are talking about the same thing. I enjoy pairing, giving and receiving honest feedback, and helping others grow, which I did as a mentor at Noroff.",
};

const LIFE_STORY = {
  no: "Utenom jobb prøver jeg å holde livet i balanse. Jeg er glad i yoga og meditasjon, trives ute i naturen, og deler dagene mine med to labradoodler som sørger for at jeg aldri hopper over en tur.",
  en: "Outside work, I try to keep my life balanced. I'm a yoga and meditation enthusiast, I love being out in nature, and I share my days with my two Labradoodles, who make sure I never skip a walk.",
};

const CLOSING = {
  no: "Jeg jobber gjerne hybrid eller remote, og setter stor pris på en prat, selv en kort en, for å høre mer om teamet og det dere bygger.\n\nCV-en min ligger vedlagt. Takk for at du leste, og jeg håper vi snakkes snart.\n\nVennlig hilsen\nOlga Goryszewska\n+47 483 38 779 · olga.goryszewska@gmail.com",
  en: "I'm happy to work remotely or in a hybrid setup, and I'd really enjoy a conversation, even a short one, to hear more about the team and what you're building.\n\nMy CV is attached. Thank you for reading, and I hope to speak with you soon.\n\nWarm regards,\nOlga Goryszewska\n+47 483 38 779 · olga.goryszewska@gmail.com",
};

/** The subject when the agent emails an application to a job ad. */
export const adSubject = (title: string, language: string) =>
  language === "no" ? `Søknad: ${title}` : `Application: ${title}`;

/** A warm, personal cover letter for one ad, in Olga's own voice. */
export function coverLetter(input: LetterInput) {
  if (DOMAIN_ROLE.test(input.title)) return domainLetter(input);
  const skills = input.matched.filter((skill) => skill !== "Health/beauty").slice(0, 4);
  const main = skills[0] ?? "frontend";
  const design = /(ux|ui designer|product designer|produktdesigner|tjenestedesigner)/i.test(input.title);
  const no = input.language === "no";
  const skillList =
    skills.length > 1 ? `${skills.slice(0, -1).join(", ")} ${no ? "og" : "and"} ${skills.at(-1)}` : skills[0];
  const at = input.company ? (no ? ` hos ${input.company}` : ` at ${input.company}`) : "";
  const parts = no
    ? [
        "Hei,",
        `Jeg søker på stillingen som ${input.title}${at}, fordi jeg ser etter et team der jeg kan fortsette å vokse mens jeg jobber med løsninger ekte mennesker er avhengige av.`,
        CLINIC_STORY.no,
        FUELFLO_STORY.no,
        skillList
          ? `Til daglig jobber jeg med ${skillList}. Polsk er morsmålet mitt, og jeg jobber komfortabelt på norsk og engelsk, så jeg er vant til å bygge broer mellom mennesker så vel som i kode.`
          : "Polsk er morsmålet mitt, og jeg jobber komfortabelt på norsk og engelsk, så jeg er vant til å bygge broer mellom mennesker så vel som i kode.",
        `${input.company ? `Hos ${input.company} vil jeg bidra` : "Jeg vil bidra"} med ${design ? "gjennomtenkt, brukertestet design" : `pålitelig, godt testet ${main}-kode`}, og være en lagkamerat som kommuniserer tydelig med både kunder og kolleger.`,
        TEAM_STORY.no,
        LIFE_STORY.no,
        CLOSING.no,
      ]
    : [
        "Hi,",
        `I'm applying for the ${input.title} role${at} because I'm looking for a team where I can keep growing while working on things real people depend on.`,
        CLINIC_STORY.en,
        FUELFLO_STORY.en,
        skillList
          ? `Day to day I work with ${skillList}. Polish is my native language and I work comfortably in English and Norwegian, so I'm used to bridging people as well as code.`
          : "Polish is my native language and I work comfortably in English and Norwegian, so I'm used to bridging people as well as code.",
        `${input.company ? `At ${input.company}, I'd contribute` : "I'd contribute"} ${design ? "thoughtful, user-tested design" : `reliable, well-tested ${main} code`}, and I'd be a teammate who communicates clearly with both clients and colleagues.`,
        TEAM_STORY.en,
        LIFE_STORY.en,
        CLOSING.en,
      ];
  return parts.join("\n\n");
}

/** Product, implementation and customer-success roles: the clinic years lead. */
function domainLetter(input: LetterInput) {
  const no = input.language === "no";
  const at = input.company ? (no ? ` hos ${input.company}` : ` at ${input.company}`) : "";
  const parts = no
    ? [
        "Hei,",
        `Jeg søker på stillingen som ${input.title}${at}, fordi jeg kjenner begge sider av produkter som deres: hverdagen til dem som bruker dem, og teknologien bak.`,
        CLINIC_STORY.no,
        FUELFLO_STORY.no,
        "Polsk er morsmålet mitt, og jeg jobber komfortabelt på norsk og engelsk. Jeg har også jobbet som assistent ved en psykiatrisk avdeling i Bergen kommune, så jeg er vant til å møte folk der de er.",
        `${input.company ? `Hos ${input.company} vil jeg bidra` : "Jeg vil bidra"} med forståelse for kundene deres og evnen til å oversette behovene deres til løsninger som faktisk blir tatt i bruk.`,
        TEAM_STORY.no,
        LIFE_STORY.no,
        CLOSING.no,
      ]
    : [
        "Hi,",
        `I'm applying for the ${input.title} role${at} because I know both sides of products like yours: the daily reality of the people using them, and the technology behind them.`,
        CLINIC_STORY.en,
        FUELFLO_STORY.en,
        "Polish is my native language and I work comfortably in English and Norwegian. I've also worked as an assistant in a psychiatric department at Bergen Kommune, so I'm used to meeting people where they are.",
        `${input.company ? `At ${input.company}, I'd bring` : "I'd bring"} an understanding of your customers and the ability to turn their needs into solutions they actually adopt.`,
        TEAM_STORY.en,
        LIFE_STORY.en,
        CLOSING.en,
      ];
  return parts.join("\n\n");
}

type CareerVariant = "aesthetics" | "beauty" | "health" | "device" | "ai";

/** Which story fits a company, from its tracker entry. */
export function careerVariant(contact: { industry?: string | null; specialisation?: string | null }): CareerVariant {
  const about = contact.specialisation ?? "";
  if (contact.industry === "BeautyTech") return /(aesthetic|clinic|medspa)/i.test(about) ? "aesthetics" : "beauty";
  if (/(\bMRI\b|cardiac|device|diagnostic)/i.test(about)) return "device";
  if (/\bAI\b/.test(about)) return "ai";
  return "health";
}

const CAREER_COPY: Record<
  CareerVariant,
  { no: { field: string; background: string; goal: string }; en: { field: string; background: string; goal: string } }
> = {
  aesthetics: {
    en: {
      field: "medical aesthetics and technology",
      background:
        "giving me first-hand experience of the challenges involved in managing an aesthetics business, working with clients and delivering treatments",
      goal: "joining a company developing technology for the medical aesthetics industry",
    },
    no: {
      field: "medisinsk estetikk og teknologi",
      background:
        "og vet av egen erfaring hva det innebærer å drive en estetisk virksomhet, jobbe med klienter og utføre behandlinger",
      goal: "bli med i et selskap som utvikler teknologi for den medisinske estetikkbransjen",
    },
  },
  beauty: {
    en: {
      field: "beauty and technology",
      background:
        "giving me first-hand experience of what clients expect from a beauty business and how the customer experience works in practice",
      goal: "joining a company developing technology for the beauty industry",
    },
    no: {
      field: "skjønnhet og teknologi",
      background:
        "og vet av egen erfaring hva kunder forventer av en skjønnhetsvirksomhet, og hvordan kundeopplevelsen fungerer i praksis",
      goal: "bli med i et selskap som utvikler teknologi for skjønnhetsbransjen",
    },
  },
  health: {
    en: {
      field: "healthcare and technology",
      background:
        "and I have since worked as an assistant in a psychiatric department at Bergen Kommune, so I understand both patient-facing work and how care is organised day to day",
      goal: "joining a company developing technology for healthcare",
    },
    no: {
      field: "helse og teknologi",
      background:
        "og har siden jobbet som assistent ved en psykiatrisk avdeling i Bergen kommune, så jeg kjenner både pasientnært arbeid og hvordan hverdagen i helsetjenesten er organisert",
      goal: "bli med i et selskap som utvikler teknologi for helsesektoren",
    },
  },
  device: {
    en: {
      field: "clinical practice and technology",
      background:
        "which taught me how clinical work happens in practice and what makes people adopt a new product or procedure",
      goal: "joining a company bringing new technology into clinical environments",
    },
    no: {
      field: "klinisk praksis og teknologi",
      background:
        "og har lært hvordan klinisk arbeid foregår i praksis, og hva som gjør at folk tar i bruk et nytt produkt",
      goal: "bli med i et selskap som tar ny teknologi inn i kliniske miljøer",
    },
  },
  ai: {
    en: {
      field: "healthcare and AI-driven products",
      background:
        "and I have since worked as an assistant in a psychiatric department at Bergen Kommune, so I understand the people these products are built for",
      goal: "joining a company building AI-powered products for healthcare",
    },
    no: {
      field: "helse og AI-drevne produkter",
      background:
        "og har siden jobbet som assistent ved en psykiatrisk avdeling i Bergen kommune, så jeg kjenner menneskene disse produktene lages for",
      goal: "bli med i et selskap som bygger AI-drevne produkter for helsesektoren",
    },
  },
};

/**
 * First contact from the Recruiters & companies tracker: an introduction, not
 * a job request. Clinic years first, then proof of product work, then an open
 * ask. Norwegian for Norway contacts, English otherwise.
 */
export function careerApplication(contact: {
  kind: "agency" | "recruiter" | "company";
  name: string;
  coverage: string | null;
  industry?: string | null;
  specialisation?: string | null;
}) {
  const norwegian = /\b(norway|oslo|bergen|norge)\b/i.test(contact.coverage ?? "");
  const company = contact.kind === "company";
  const greetingName = contact.kind === "recruiter" ? contact.name.split(/\s/)[0] : null;
  const variant = company ? careerVariant(contact) : "health";
  if (norwegian) {
    const copy = CAREER_COPY[variant].no;
    return {
      subject: `Introduksjon: ${copy.field}`,
      body: [
        greetingName ? `Hei ${greetingName},` : "Hei,",
        company
          ? `Jeg tar kontakt med ${contact.name} fordi arbeidet deres ligger i skjæringspunktet mellom to felt jeg kjenner godt: ${copy.field}.`
          : "Jeg tar kontakt fordi jeg kombinerer to felt jeg kjenner godt: helse og estetikk, og teknologi.",
        `I 13 år eide og drev jeg en klinikk for medisinsk mikropigmentering i Norge og samarbeidet med medisinske og estetiske klinikker, ${copy.background}. Jeg har også en bachelorgrad i folkehelse.`,
        "De siste tre årene har jeg gått over til teknologi og digital produktutvikling, med UX-design og frontend-utvikling. Jeg har også på egen hånd designet og bygget FuelFlo, en programvareplattform for å styre komplekse operative prosesser.",
        `Nå vil jeg forene disse to verdenene og ${copy.goal}. Jeg er særlig interessert i muligheter innen produkt, implementering, kundesuksess eller digitale løsninger.`,
        "Jeg snakker flytende norsk og polsk, og avansert engelsk.",
        company
          ? "Er du åpen for en kort prat, eller kan du vise meg til den som har ansvar for produkt, partnerskap eller rekruttering?"
          : "Er du åpen for en kort prat om hvilke selskaper dette kan passe for?",
        "CV-en min ligger vedlagt, og jeg presenterer meg gjerne nærmere.",
        "Med vennlig hilsen\nOlga Goryszewska\n+47 483 38 779 · linkedin.com/in/olga-goryszewska",
      ].join("\n\n"),
    };
  }
  const copy = CAREER_COPY[variant].en;
  return {
    subject: `Introduction: ${copy.field}`,
    body: [
      greetingName ? `Hi ${greetingName},` : "Hello,",
      company
        ? `I'm reaching out to ${contact.name} because your work sits at the intersection of two fields I know well: ${copy.field}.`
        : "I'm reaching out because I combine two fields I know well: health and aesthetics, and technology.",
      `For 13 years, I owned and ran a medical micropigmentation clinic in Norway and collaborated with medical and aesthetic clinics, ${copy.background}. I also hold a bachelor's degree in Public Health.`,
      "Over the past three years, I've moved into technology and digital product development, combining UX design and frontend development. I've also independently designed and built FuelFlo, a software platform for managing complex operational processes.",
      `I'm now looking to bring these two worlds together by ${copy.goal}. I'd be particularly interested in opportunities across product, implementation, customer success or digital solutions.`,
      "I speak fluent Norwegian and Polish, as well as advanced English.",
      company
        ? "Would you be open to a short conversation, or could you point me towards the person responsible for product, partnerships or recruitment?"
        : "Would you be open to a short conversation about which companies this could suit?",
      "I've attached my CV and would love to introduce myself.",
      "Best regards,\nOlga Goryszewska\n+47 483 38 779 · linkedin.com/in/olga-goryszewska",
    ].join("\n\n"),
  };
}

// Why this kind of company, by its industry code in the register.
const OPEN_REASON: { code: RegExp; reason: (company: string) => string }[] = [
  {
    code: /^62\.1/,
    reason: (company) =>
      `Jeg sender en åpen søknad til ${company} fordi dere utvikler programvare, og det er der jeg trives best: å følge et produkt fra idé til noe folk faktisk bruker hver dag.`,
  },
  {
    code: /^62\.2/,
    reason: (company) =>
      `Jeg sender en åpen søknad til ${company} fordi dere leverer utvikling og rådgivning til kunder, og jeg vil gjerne jobbe som utvikler på kundeprosjekter – fast, på prosjekt eller som konsulent.`,
  },
  {
    code: /^73\.1/,
    reason: (company) =>
      `Jeg sender en åpen søknad til ${company} fordi jeg kombinerer det et byrå trenger: UX-design og utvikling. Jeg tar gjerne en idé fra skisse i Figma til en ferdig løsning i React og Next.js.`,
  },
  {
    code: /^74\.1/,
    reason: (company) =>
      `Jeg sender en åpen søknad til ${company} fordi dere jobber med design, og jeg er en utvikler med UX-bakgrunn som kan gjøre gode design om til raske, ferdige løsninger på nett og mobil.`,
  },
];

/** An open application to an agency or consultancy that hasn't advertised a role. */
export function openApplication(company: string, industryCode: string | null = null) {
  const reason =
    OPEN_REASON.find((item) => industryCode && item.code.test(industryCode))?.reason(company) ??
    `Jeg sender en åpen søknad til ${company}, i tilfelle dere trenger en fullstack-utvikler eller produktutvikler nå eller fremover – fast, på prosjekt eller som konsulent.`;
  return {
    subject: "Åpen søknad – fullstack-utvikler og produktutvikler (React, Next.js, React Native)",
    body: [
      "Hei,",
      reason,
      CV_HIGHLIGHT.no,
      BACKGROUND_LINE.no,
      "Jeg jobber med React, Next.js, TypeScript, React Native, Node.js og Supabase/PostgreSQL, og har bakgrunn i UX (Figma, brukertesting).",
      "CV-en min ligger vedlagt, og porteføljen finner du på enodre.com. Passer det med en kort prat?",
      "Med vennlig hilsen\nOlga Goryszewska\n+47 483 38 779 · linkedin.com/in/olga-goryszewska",
    ].join("\n\n"),
  };
}

/**
 * A LinkedIn connection note (LinkedIn allows 300 characters). Personal and
 * short: written to be sent by you, one at a time.
 */
export function linkedinNote(contact: {
  kind: "agency" | "recruiter" | "company";
  name: string;
  organisation?: string | null;
}) {
  const first = contact.kind === "recruiter" ? contact.name.split(/\s/)[0] : null;
  const note =
    contact.kind === "company"
      ? `Hi, I'm Olga: 13 years running a medical aesthetics clinic, now a UX designer and React developer building health and beauty tech. I follow ${contact.name}'s work and would love to connect.`
      : `Hi${first ? ` ${first}` : ""}, I'm Olga: 13 years running a medical aesthetics clinic, now a UX designer and React developer for health and beauty tech. I'd love to connect and hear which roles you're recruiting for.`;
  return note.length <= 300 ? note : `${note.slice(0, 297).trimEnd()}…`;
}
