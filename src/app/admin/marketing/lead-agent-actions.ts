"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCompany, getKeyPerson, getMunicipalityNumbers, searchCompanies } from "@/lib/brreg";
import { findHiringAds } from "@/lib/nav-jobs";
import { findCompanyEmails } from "@/lib/email-discovery";
import { LeadResearchError, RESEARCH_MODEL, researchLead, type ResearchUsage } from "@/lib/lead-research";
import {
  LEAD_COUNTIES,
  LEAD_INDUSTRIES,
  RESEARCH_BUDGET,
  HIRING_SEARCH_DAYS,
  canStartResearch,
  hiringFact,
  isExtraHandsProspect,
  startOfMonthIso,
  type HiringSignal,
  type LeadCandidate,
  type ResearchOutcome,
} from "@/lib/lead-candidate";
import { MAX_RESEARCH_ATTEMPTS, classifyResearchError, isStaleProcessing } from "@/lib/gtm-logic";
import { isMissingColumnError } from "@/lib/lead-updates";
import { industryFromCode } from "@/lib/industry-playbooks";

const TABLE = "lead_candidates";
const RUNS_TABLE = "lead_research_runs";

const findLeadsSchema = z
  .object({
    industryCodes: z
      .array(z.enum(LEAD_INDUSTRIES.map((industry) => industry.code)))
      .min(1, "Pick at least one industry."),
    countyCodes: z.array(z.enum(LEAD_COUNTIES.map((county) => county.code))).min(1, "Pick at least one county."),
    minEmployees: z.number().int().min(0),
    maxEmployees: z.number().int().min(1),
    limit: z.number().int().min(1).max(50),
  })
  .refine((values) => values.maxEmployees >= values.minEmployees, {
    message: "Max employees must be at least min employees.",
  });

export type FindLeadsInput = z.infer<typeof findLeadsSchema>;

// These actions spend money (Claude) or write in bulk, so they check the
// session explicitly instead of relying on RLS alone.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return supabase;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Sum of every research run this calendar month (UTC), failures included. */
async function getResearchSpendThisMonth(supabase: SupabaseClient) {
  const { data, error } = await supabase.from(RUNS_TABLE).select("cost_usd").gte("created_at", startOfMonthIso());
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0);
}

async function recordRun(
  supabase: SupabaseClient,
  candidateId: string,
  outcome: "researched" | "failed" | "over_budget",
  usage: ResearchUsage,
  errorMessage: string | null
) {
  const { error } = await supabase.from(RUNS_TABLE).insert({
    candidate_id: candidateId,
    outcome,
    model: RESEARCH_MODEL,
    cost_usd: usage.costUsd,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_read_tokens: usage.cacheReadTokens,
    cache_write_tokens: usage.cacheWriteTokens,
    web_search_requests: usage.webSearchRequests,
    web_fetch_requests: usage.webFetchRequests,
    api_requests: usage.apiRequests,
    error: errorMessage,
  });
  // Losing a spend record would undercount the budget — log loudly.
  if (error) console.error("Failed to record lead research run:", error);
}

/** Finder agent: Brønnøysundregistrene -> new lead_candidates rows. */
export async function findLeads(input: FindLeadsInput) {
  const values = findLeadsSchema.parse(input);
  const supabase = await requireAdmin();

  const { data: existing, error: existingError } = await supabase.from(TABLE).select("org_number");
  if (existingError) throw existingError;

  const municipalityNumbers = await getMunicipalityNumbers(values.countyCodes);
  const { companies, totalMatches } = await searchCompanies({
    industryCodes: values.industryCodes,
    municipalityNumbers,
    minEmployees: values.minEmployees,
    maxEmployees: values.maxEmployees,
    limit: values.limit,
    exclude: new Set((existing ?? []).map((row) => row.org_number as string)),
  });

  // Role lookups are one request each — run them in parallel, and treat a
  // failed lookup as "no contact found" rather than failing the batch.
  const keyPeople = await Promise.all(companies.map((company) => getKeyPerson(company.orgNumber).catch(() => null)));

  if (companies.length > 0) {
    const { error } = await supabase.from(TABLE).upsert(
      companies.map((company, index) => ({
        org_number: company.orgNumber,
        company: company.name,
        industry_code: company.industryCode,
        industry_label: company.industryLabel,
        employees: company.employees,
        municipality: company.municipality,
        address: company.address,
        phone: company.phone,
        website: company.website,
        founded: company.founded,
        contact_name: keyPeople[index]?.name ?? null,
        contact_role: keyPeople[index]?.role ?? null,
      })),
      { onConflict: "org_number", ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  revalidatePath("/admin/marketing");
  return { added: companies.length, totalMatches };
}

/** "XLENT AS" vs "Xlent Oslo AS": do they share their first real word? */
function sameCompanyName(adName: string, registerName: string) {
  const firstWord = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .find((word) => word.length >= 3 && !["the", "and", "avd", "as", "asa"].includes(word));
  const word = firstWord(registerName);
  return Boolean(word && adName.toLowerCase().includes(word));
}

const findHiringSchema = z.object({
  days: z.union(HIRING_SEARCH_DAYS.map((days) => z.literal(days))),
  scope: z.enum(["partners", "all"]),
});

export type FindHiringInput = z.infer<typeof findHiringSchema>;

/**
 * Finder, hiring signals: companies advertising for developers or designers
 * on arbeidsplassen.no (NAV) -> lead_candidates rows with the ads attached.
 * Free (no Claude). Companies already in the queue get their signal refreshed.
 */
export async function findHiringCompanies(input: FindHiringInput) {
  const values = findHiringSchema.parse(input);
  const supabase = await requireAdmin();

  const ads = await findHiringAds(values.days);
  const byEmployer = new Map<string, typeof ads>();
  for (const ad of ads) byEmployer.set(ad.employerOrgNumber, [...(byEmployer.get(ad.employerOrgNumber) ?? []), ad]);

  // Ads may name a branch — resolve each employer to its company in the register.
  const employers = [...byEmployer.entries()];
  const companies = await Promise.all(employers.map(([orgNumber]) => getCompany(orgNumber).catch(() => null)));
  const found = new Map<string, { company: NonNullable<(typeof companies)[number]>; signal: HiringSignal }>();
  // Many companies have no website in the register; the ad often gives one.
  const homepages = new Map<string, string>();
  employers.forEach(([, employerAds], index) => {
    const company = companies[index];
    if (!company) return;
    // Only when the ad is posted under the company's own name — a recruiter's
    // ad (e.g. Ansettr for Spond) carries the recruiter's homepage.
    const homepage = employerAds.find(
      (ad) => ad.employerHomepage && sameCompanyName(ad.employerName, company.name)
    )?.employerHomepage;
    if (homepage && !homepages.has(company.orgNumber)) homepages.set(company.orgNumber, homepage);
    const signalAds = employerAds.map(({ title, url, published, engagement }) => ({
      title,
      url,
      published,
      engagement,
    }));
    if (!isExtraHandsProspect(company.industryCode, signalAds, values.scope)) return;
    const existing = found.get(company.orgNumber);
    found.set(company.orgNumber, {
      company,
      signal: { ads: [...(existing?.signal.ads ?? []), ...signalAds], found_at: new Date().toISOString() },
    });
  });

  const { data: existingRows, error: existingError } = await supabase.from(TABLE).select("org_number, status");
  if (existingError) throw existingError;
  const known = new Map((existingRows ?? []).map((row) => [row.org_number as string, row.status as string]));
  const fresh = [...found.values()].filter(({ company }) => !known.has(company.orgNumber));
  const keyPeople = await Promise.all(fresh.map(({ company }) => getKeyPerson(company.orgNumber).catch(() => null)));

  const rows = fresh.map(({ company, signal }, index) => ({
    org_number: company.orgNumber,
    company: company.name,
    industry_code: company.industryCode,
    industry_label: company.industryLabel,
    employees: company.employees,
    municipality: company.municipality,
    address: company.address,
    phone: company.phone,
    website: company.website ?? homepages.get(company.orgNumber) ?? null,
    founded: company.founded,
    contact_name: keyPeople[index]?.name ?? null,
    contact_role: keyPeople[index]?.role ?? null,
    hiring_signal: signal,
  }));
  let signalSaved = true;
  if (rows.length > 0) {
    let { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "org_number", ignoreDuplicates: true });
    // Before partner_track.sql the column is missing — add the companies without it.
    if (error && isMissingColumnError(error)) {
      signalSaved = false;
      ({ error } = await supabase.from(TABLE).upsert(
        rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "hiring_signal"))),
        { onConflict: "org_number", ignoreDuplicates: true }
      ));
    }
    if (error) throw error;
  }

  // Already queued (not yet moved to potential customers): refresh the signal.
  let refreshed = 0;
  if (signalSaved) {
    for (const { company, signal } of found.values()) {
      const status = known.get(company.orgNumber);
      if (!status || status === "approved" || status === "rejected") continue;
      const { error } = await supabase
        .from(TABLE)
        .update({ hiring_signal: signal, updated_at: new Date().toISOString() })
        .eq("org_number", company.orgNumber);
      if (error) {
        if (isMissingColumnError(error)) break;
        throw error;
      }
      refreshed++;
    }
  }

  revalidatePath("/admin/marketing");
  return { added: rows.length, refreshed, employers: found.size, ads: ads.length, signalSaved };
}

// Queue columns added by gtm_command_centre.sql. Until it has run, writes
// retry without them (and without the 'processing' state) instead of failing.
const QUEUE_COLUMNS = ["research_started_at", "attempts", "error_kind"];
const CHECK_VIOLATION = "23514";

async function updateCandidate(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
  where: (query: ReturnType<ReturnType<SupabaseClient["from"]>["update"]>) => typeof query = (query) => query
) {
  const values = { ...patch, updated_at: new Date().toISOString() };
  const run = (row: Record<string, unknown>) => where(supabase.from(TABLE).update(row).eq("id", id)).select("id");
  let { data, error } = await run(values);
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await run(
      Object.fromEntries(Object.entries(values).filter(([key]) => !QUEUE_COLUMNS.includes(key)))
    ));
  }
  return { rows: data?.length ?? 0, error };
}

/**
 * Researcher agent: Claude researches one candidate and drafts the message.
 * Safe to call twice: finished candidates are skipped (no second paid run),
 * and a claim on the row stops two runs processing the same company.
 */
export async function researchLeadCandidate(id: string): Promise<ResearchOutcome> {
  const supabase = await requireAdmin();

  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error) throw error;
  const candidate = data as LeadCandidate;
  const attempts = candidate.attempts ?? 0;

  if (["researched", "approved", "rejected"].includes(candidate.status)) {
    return { status: "skipped", message: `${candidate.company} is already ${candidate.status}.` };
  }
  if (candidate.status === "processing" && !isStaleProcessing(candidate.research_started_at ?? null)) {
    return { status: "skipped", message: `${candidate.company} is already being researched.` };
  }
  if (candidate.status === "failed" && candidate.error_kind !== "blocked" && attempts >= MAX_RESEARCH_ATTEMPTS) {
    return {
      status: "failed",
      message: `${candidate.company} has failed ${attempts} times — check the error, or add it without research.`,
    };
  }

  // Budget guard runs server-side, so it holds even if the UI is bypassed.
  const monthSpend = await getResearchSpendThisMonth(supabase);
  if (!canStartResearch(monthSpend)) {
    return {
      status: "failed",
      blocked: true,
      message: `Monthly research budget reached ($${monthSpend.toFixed(2)} of $${RESEARCH_BUDGET.monthlyUsd}). It resets on the 1st.`,
    };
  }

  // Claim the row: only succeeds if nobody changed it since we read it.
  const claim = await updateCandidate(
    supabase,
    id,
    { status: "processing", research_started_at: new Date().toISOString(), attempts: attempts + 1, error: null },
    (query) => query.eq("status", candidate.status)
  );
  if (claim.error && claim.error.code !== CHECK_VIOLATION) throw claim.error;
  // CHECK_VIOLATION = the 'processing' state doesn't exist yet (migration not
  // run) — carry on without the claim, as before.
  if (!claim.error && claim.rows === 0) {
    return { status: "skipped", message: `${candidate.company} was picked up by another run.` };
  }

  try {
    const { research, usage } = await researchLead({
      company: candidate.company,
      orgNumber: candidate.org_number,
      industryCode: candidate.industry_code,
      industryLabel: candidate.industry_label,
      employees: candidate.employees,
      municipality: candidate.municipality,
      address: candidate.address,
      website: candidate.website,
      founded: candidate.founded,
      contactName: candidate.contact_name,
      contactRole: candidate.contact_role,
      hiringAds: candidate.hiring_signal?.ads,
    });

    // The research is paid for — try twice to save it before giving up.
    const result = {
      status: "researched",
      research,
      fit_score: research.fit_score,
      website: candidate.website ?? research.website,
      cost_usd: usage.costUsd,
      error: null,
      error_kind: null,
      researched_at: new Date().toISOString(),
    };
    let saved = await updateCandidate(supabase, id, result);
    if (saved.error) saved = await updateCandidate(supabase, id, result);
    await recordRun(
      supabase,
      id,
      saved.error ? "failed" : "researched",
      usage,
      saved.error ? "Result couldn't be saved" : null
    );
    if (saved.error) {
      console.error(`Research for ${candidate.company} succeeded but couldn't be saved:`, saved.error);
      await updateCandidate(supabase, id, {
        status: "failed",
        error: "Research finished but couldn't be saved.",
        error_kind: "retryable",
      });
      return { status: "failed", message: "Research finished but couldn't be saved. Try again." };
    }
    revalidatePath("/admin/marketing");
    return { status: "researched" };
  } catch (researchError) {
    if (!(researchError instanceof LeadResearchError)) {
      await updateCandidate(supabase, id, { status: "failed", error: "Unexpected error.", error_kind: "retryable" });
      throw researchError;
    }
    console.error(`Lead research failed for ${candidate.company}:`, researchError);
    // overBudget = this company passed the per-company cap: specific to it,
    // not account-wide, so it needs a person rather than a blind retry.
    const kind = researchError.overBudget ? "permanent" : classifyResearchError(researchError.message);
    await recordRun(
      supabase,
      id,
      researchError.overBudget ? "over_budget" : "failed",
      researchError.usage,
      researchError.message
    );
    await updateCandidate(supabase, id, {
      status: "failed",
      error: researchError.message,
      error_kind: kind,
      // An account-wide problem isn't this company's fault — don't use up an attempt.
      ...(kind === "blocked" ? { attempts } : {}),
      cost_usd: researchError.usage.costUsd,
      researched_at: new Date().toISOString(),
    });
    revalidatePath("/admin/marketing");
    return {
      status: "failed",
      blocked: kind === "blocked",
      message:
        kind === "blocked"
          ? `Research is blocked for the whole account: ${researchError.message}`
          : `${candidate.company}: ${researchError.message}`,
    };
  }
}

/**
 * Moves a candidate into the Potential Customers pipeline with everything the
 * finder has on it (register data, plus the research if it was run), then
 * marks it approved so it leaves the finder queue and isn't found again.
 */
export async function approveLeadCandidate(id: string) {
  const supabase = await requireAdmin();

  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error) throw error;
  const candidate = data as LeadCandidate;
  if (candidate.potential_customer_id) return;

  // Already in the pipeline (added by hand or from another list) — link it
  // instead of creating a duplicate.
  const { data: existing, error: existingError } = await supabase
    .from("potential_customers")
    .select("id")
    .eq("org_number", candidate.org_number)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const { error: linkError } = await supabase
      .from(TABLE)
      .update({ status: "approved", potential_customer_id: existing.id, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (linkError) throw linkError;
    revalidatePath("/admin/marketing");
    return;
  }

  // A hiring signal makes it a partner lead, and the ad is a sourced fact.
  const hiring = candidate.hiring_signal?.ads.length ? candidate.hiring_signal : null;
  const hiringFactRow = hiring ? hiringFact(hiring) : null;

  const notes = [
    candidate.research?.summary,
    hiring && ["Hiring (arbeidsplassen.no):", ...hiring.ads.map((ad) => `- ${ad.title} — ${ad.url}`)].join("\n"),
    [
      candidate.industry_label,
      candidate.contact_name && candidate.contact_role && `${candidate.contact_role}: ${candidate.contact_name}`,
      candidate.founded && `Founded ${candidate.founded}`,
    ]
      .filter(Boolean)
      .join(" · "),
    candidate.address && `Address: ${candidate.address}`,
    candidate.website && `Website: ${candidate.website}`,
    candidate.research && `Likely pain: ${candidate.research.likely_pain}`,
    candidate.research && ["Message:", candidate.research.message_no].join("\n"),
    !candidate.research &&
      !hiring &&
      "Added from the register without research — find an opener fact before contacting.",
  ]
    .filter(Boolean)
    .join("\n\n");

  // The company's general address (register, then website) — free, a few
  // seconds. Only post@/kontakt@-style addresses are saved (§15).
  const registerEmail = (await getCompany(candidate.org_number).catch(() => null))?.email ?? null;
  const search = await findCompanyEmails({
    website: candidate.website ?? candidate.research?.website ?? null,
    registerEmail,
    companyName: candidate.company,
    orgNumber: candidate.org_number,
    contactName: candidate.contact_name,
  }).catch(() => null);
  const website = candidate.website ?? candidate.research?.website ?? search?.website ?? null;
  const email = search?.emails.find((item) => item.generic)?.email ?? null;

  const baseRow = {
    name: candidate.contact_name ?? candidate.company,
    company: candidate.company,
    email,
    phone: candidate.phone,
    source: "brreg-agent",
    status: "new",
    notes,
    segment: hiring
      ? "P"
      : (LEAD_INDUSTRIES.find((industry) => industry.code === candidate.industry_code)?.priority ?? null),
    employees: candidate.employees,
    location: candidate.municipality,
    org_number: candidate.org_number,
    website,
    opener_fact: candidate.research?.facts[0]?.fact ?? hiringFactRow?.fact ?? null,
    opener_source: candidate.research?.facts[0]?.source_url ?? hiringFactRow?.source_url ?? null,
  };
  const researchFacts = [
    ...(hiringFactRow ? [hiringFactRow] : []),
    ...(candidate.research?.facts ?? []).filter((fact) => fact.source_url !== hiringFactRow?.source_url),
  ];
  // The research and industry move onto the lead (outreach_system.sql columns);
  // before that migration, insert without them rather than failing.
  const insertRow = (row: Record<string, unknown>) =>
    supabase.from("potential_customers").insert(row).select("id").single();
  let { data: created, error: insertError } = await insertRow({
    ...baseRow,
    industry: hiring ? "agency_partner" : industryFromCode(candidate.industry_code),
    research: candidate.research
      ? { ...candidate.research, facts: researchFacts, researched_at: candidate.researched_at }
      : hiringFactRow
        ? { facts: researchFacts }
        : null,
  });
  if (insertError && isMissingColumnError(insertError)) {
    ({ data: created, error: insertError } = await insertRow(baseRow));
  }
  if (insertError || !created) throw insertError ?? new Error("Couldn't add the lead.");

  const { error: updateError } = await supabase
    .from(TABLE)
    .update({ status: "approved", potential_customer_id: created.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) throw updateError;

  revalidatePath("/admin/marketing");
}

export async function rejectLeadCandidate(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from(TABLE)
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/marketing");
}
