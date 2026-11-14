// New people and companies to contact, for Recruiters & companies. Pure, so
// it's unit-tested; the server action does the fetching.

export type CareerCandidate = {
  kind: "agency" | "company";
  name: string;
  website: string | null;
  coverage: string | null;
  /** Why it's suggested, shown in the preview and saved as its description. */
  reason: string;
  industry: "HealthTech" | "BeautyTech" | null;
  fit: "high" | "medium";
  linkedin: string;
  /** Applied to before (from the sent log): still listed, but flagged. */
  appliedBefore: boolean;
};

export type AdRow = {
  company: string | null;
  title: string;
  city: string | null;
  snippet: string | null;
  score: number;
  url: string;
};

export type AgencyRow = { name: string; website: string | null; municipality: string | null; employees: number | null };

// Recruitment and staffing firms, by how they name themselves.
const RECRUITER =
  /(recruit|rekrutt|talent|headhunt|executive search|\bsearch\b|bemanning|staffing|personnel|manpower|adecco|randstad|\bhays\b|academic work|experis|kelly services|jefferson|nigel frank|harvey nash|michael page|page personnel|robert half|\bework\b|witted|onhires|hirewise|jobzone|\bkarriere|\bjobb)/i;
// Tech-minded recruiters among the register's many staffing firms.
const TECH_RECRUITER = /(\bit\b|tech|digital|data|talent|search|executive|recruit|rekrutt|headhunt|developer|people)/i;

const BEAUTY =
  /(aesthetic|estetisk|beauty|skjønnhet|skincare|skin care|cosmetic|kosmetikk|dermatolog|medspa|\bsalon\b|fresha|booksy|treatwell|phorest|zenoti|clinicminds|pabau|nextmotion)/i;
const HEALTH =
  /(health|helse|medtech|medical|medisinsk|clinic|klinikk|clinical|patient|pasient|hospital|sykehus|care tech|dignio|doctolib|docplanner|doctoralia|kry\b|aidn|webmed|dips\b)/i;
// Staff perks mention health too; they say nothing about the company.
const PERKS =
  /(private |medical |dental |mental )?(health|healthcare|medical)[ -]?(insurance|care|benefits?|cover(age)?|plan|allowance|stipend)|(wellness|wellbeing)[ -]?(stipend|allowance|programs?|benefits?|budget)|helseforsikring/gi;

const key = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(as|asa|ab|ltd|limited|inc|gmbh|group|norge|norway)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");

export function isRecruiterName(name: string) {
  return RECRUITER.test(name);
}

/** HealthTech or BeautyTech, from the ad itself: never from its staff perks. */
export function careerIndustry(text: string): "HealthTech" | "BeautyTech" | null {
  const plain = text.replace(PERKS, " ");
  if (BEAUTY.test(plain)) return "BeautyTech";
  if (HEALTH.test(plain)) return "HealthTech";
  return null;
}

const linkedinPeople = (keywords: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;

/**
 * Companies hiring for your kind of role (from the ads the job agent found),
 * the recruiters posting those ads, and tech recruiters in the register.
 * Anything already in the tracker is left out; best fit first.
 */
export function careerCandidates(input: {
  ads: AdRow[];
  agencies: AgencyRow[];
  existing: string[];
  appliedTo: string[];
  minScore?: number;
  max?: number;
}): CareerCandidate[] {
  const known = new Set(input.existing.map(key));
  const applied = new Set(input.appliedTo.map(key));
  const byKey = new Map<string, CareerCandidate & { score: number }>();

  for (const ad of input.ads) {
    if (!ad.company) continue;
    const id = key(ad.company);
    if (!id || known.has(id)) continue;
    const agency = isRecruiterName(ad.company);
    const industry = careerIndustry(`${ad.title} ${ad.company} ${ad.snippet ?? ""}`);
    if (!agency && !industry && ad.score < (input.minScore ?? 50)) continue;
    const reason = agency
      ? `Recruiting for “${ad.title}”${ad.city ? ` (${ad.city})` : ""}`
      : `Hiring: “${ad.title}”${ad.city ? ` (${ad.city})` : ""}`;
    const current = byKey.get(id);
    if (current) {
      if (!current.reason.includes(ad.title)) current.reason += ` · “${ad.title}”`;
      current.score = Math.max(current.score, ad.score);
      continue;
    }
    byKey.set(id, {
      kind: agency ? "agency" : "company",
      name: ad.company,
      website: null,
      coverage: ad.city,
      reason,
      industry,
      fit: industry || ad.score >= 70 ? "high" : "medium",
      linkedin: linkedinPeople(agency ? `${ad.company} tech recruiter` : `${ad.company} recruiter`),
      appliedBefore: applied.has(id),
      score: ad.score + (industry ? 30 : 0),
    });
  }

  for (const agency of input.agencies) {
    const id = key(agency.name);
    if (!id || known.has(id) || byKey.has(id) || !TECH_RECRUITER.test(agency.name)) continue;
    byKey.set(id, {
      kind: "agency",
      name: agency.name,
      website: agency.website,
      coverage: agency.municipality,
      reason: `Recruitment agency in the register${agency.employees ? `, ${agency.employees} employees` : ""}`,
      industry: null,
      fit: "medium",
      linkedin: linkedinPeople(`${agency.name} recruiter`),
      appliedBefore: applied.has(id),
      score: 20,
    });
  }

  return [...byKey.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, input.max ?? 40)
    .map((candidate) => {
      const { score, ...rest } = candidate;
      void score;
      return rest;
    });
}
