import type { LeadResearch } from "@/lib/lead-research-schema";

// Industries ranked by fit for Jobb-til-faktura (field jobs that end in an
// invoice). Codes are Brønnøysundregistrene SN2025 codes — the register moved
// to SN2025, so old SN2007 codes (e.g. 46.711) return nothing.
// Priority "F" = close to the FuelFlo case study (fuel delivery, generators,
// equipment service), where the Researcher may reference that work.
export const LEAD_INDUSTRIES = [
  { code: "46.810", label: "Fuel wholesale / distribution", priority: "F" },
  { code: "77.390", label: "Generator & equipment rental", priority: "F" },
  {
    code: "33.140",
    label: "Generator & electrical equipment service",
    priority: "F",
  },
  { code: "33.120", label: "Machinery repair & maintenance", priority: "F" },
  { code: "09.109", label: "Oil & gas support services", priority: "F" },
  { code: "43.120", label: "Groundwork / machine contractors", priority: "A" },
  { code: "77.320", label: "Construction machinery rental", priority: "A" },
  { code: "49.410", label: "Road freight / haulage", priority: "A" },
  { code: "43.210", label: "Electrical installation", priority: "B" },
  { code: "43.221", label: "Plumbing / VVS", priority: "B" },
  { code: "81.210", label: "Cleaning", priority: "C" },
] as const;

// County codes are the first two digits of a kommunenummer (2024 county map).
export const LEAD_COUNTIES = [
  { code: "50", name: "Trøndelag" },
  { code: "39", name: "Vestfold" },
  { code: "40", name: "Telemark" },
  { code: "03", name: "Oslo" },
  { code: "32", name: "Akershus" },
  { code: "31", name: "Østfold" },
  { code: "33", name: "Buskerud" },
  { code: "34", name: "Innlandet" },
  { code: "42", name: "Agder" },
  { code: "11", name: "Rogaland" },
  { code: "46", name: "Vestland" },
  { code: "15", name: "Møre og Romsdal" },
  { code: "18", name: "Nordland" },
  { code: "55", name: "Troms" },
  { code: "56", name: "Finnmark" },
] as const;

export function isFuelFloSimilar(industryCode: string | null) {
  return LEAD_INDUSTRIES.some((industry) => industry.code === industryCode && industry.priority === "F");
}

export const LEAD_SEARCH_DEFAULTS = {
  industryCodes: LEAD_INDUSTRIES.filter((industry) => industry.priority !== "C").map((industry) => industry.code),
  countyCodes: ["50", "39", "40"],
  minEmployees: 10,
  maxEmployees: 100,
  limit: 25,
};

// Spend guards for the Researcher agent. A run that would push this month's
// spend past the budget is refused before it starts; a single company's
// research is stopped once it passes the per-company cap.
export const RESEARCH_BUDGET = {
  monthlyUsd: 10,
  perCompanyUsd: 0.6,
};

/** Spend guard: may a new run start, given what's been spent this month? */
export function canStartResearch(monthSpendUsd: number) {
  return monthSpendUsd + RESEARCH_BUDGET.perCompanyUsd <= RESEARCH_BUDGET.monthlyUsd;
}

export function startOfMonthIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// Keep in sync with the check in supabase/gtm_command_centre.sql.
export const LEAD_CANDIDATE_STATUS_VALUES = [
  "found",
  "processing",
  "researched",
  "failed",
  "approved",
  "rejected",
] as const;

export type LeadCandidateStatus = (typeof LEAD_CANDIDATE_STATUS_VALUES)[number];

export type LeadCandidate = {
  id: string;
  created_at: string;
  updated_at: string;
  org_number: string;
  company: string;
  industry_code: string | null;
  industry_label: string | null;
  employees: number | null;
  municipality: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  founded: string | null;
  contact_name: string | null;
  contact_role: string | null;
  status: LeadCandidateStatus;
  research: LeadResearch | null;
  fit_score: number | null;
  error: string | null;
  cost_usd: number | null;
  researched_at: string | null;
  potential_customer_id: string | null;
  // Added by gtm_command_centre.sql — undefined until it has run.
  research_started_at?: string | null;
  attempts?: number;
  error_kind?: "blocked" | "retryable" | "permanent" | null;
};

/** What a research run did — the panel uses it to stop a batch on account-wide problems. */
export type ResearchOutcome = {
  status: "researched" | "failed" | "skipped";
  blocked?: boolean;
  message?: string;
};

export function linkedInSearchUrl(candidate: Pick<LeadCandidate, "contact_name" | "company">) {
  const keywords = [candidate.contact_name, candidate.company].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}
