"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getKeyPerson, getMunicipalityNumbers, searchCompanies } from "@/lib/brreg";
import { LeadResearchError, RESEARCH_MODEL, researchLead, type ResearchUsage } from "@/lib/lead-research";
import {
  LEAD_COUNTIES,
  LEAD_INDUSTRIES,
  RESEARCH_BUDGET,
  canStartResearch,
  startOfMonthIso,
  type LeadCandidate,
} from "@/lib/lead-candidate";

const TABLE = "lead_candidates";
const RUNS_TABLE = "lead_research_runs";

const findLeadsSchema = z
  .object({
    industryCodes: z.array(z.enum(LEAD_INDUSTRIES.map((industry) => industry.code))).min(1, "Pick at least one industry."),
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
  const keyPeople = await Promise.all(
    companies.map((company) => getKeyPerson(company.orgNumber).catch(() => null))
  );

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

/** Researcher agent: Claude researches one candidate and drafts the message. */
export async function researchLeadCandidate(id: string) {
  const supabase = await requireAdmin();

  // Budget guard runs server-side, so it holds even if the UI is bypassed.
  const monthSpend = await getResearchSpendThisMonth(supabase);
  if (!canStartResearch(monthSpend)) {
    throw new Error(
      `Monthly research budget reached ($${monthSpend.toFixed(2)} of $${RESEARCH_BUDGET.monthlyUsd}). It resets on the 1st.`
    );
  }

  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error) throw error;
  const candidate = data as LeadCandidate;

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
    });

    const { error: updateError } = await supabase
      .from(TABLE)
      .update({
        status: "researched",
        research,
        fit_score: research.fit_score,
        website: candidate.website ?? research.website,
        cost_usd: usage.costUsd,
        error: null,
        researched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    await recordRun(supabase, id, "researched", usage, null);
    if (updateError) throw updateError;
  } catch (researchError) {
    if (!(researchError instanceof LeadResearchError)) throw researchError;
    console.error(`Lead research failed for ${candidate.company}:`, researchError);
    await recordRun(
      supabase,
      id,
      researchError.overBudget ? "over_budget" : "failed",
      researchError.usage,
      researchError.message
    );
    await supabase
      .from(TABLE)
      .update({
        status: "failed",
        error: researchError.message,
        cost_usd: researchError.usage.costUsd,
        researched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  revalidatePath("/admin/marketing");
}

/** Copies a researched candidate into the Potential Customers pipeline. */
export async function approveLeadCandidate(id: string) {
  const supabase = await requireAdmin();

  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error) throw error;
  const candidate = data as LeadCandidate;
  if (candidate.potential_customer_id) return;

  const notes = [
    candidate.research?.summary,
    candidate.website && `Website: ${candidate.website}`,
    candidate.research && `Likely pain: ${candidate.research.likely_pain}`,
    candidate.research && ["Message:", candidate.research.message_no].join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data: created, error: insertError } = await supabase
    .from("potential_customers")
    .insert({
      name: candidate.contact_name ?? candidate.company,
      company: candidate.company,
      phone: candidate.phone,
      source: "brreg-agent",
      status: "new",
      notes,
      segment: LEAD_INDUSTRIES.find((industry) => industry.code === candidate.industry_code)?.priority ?? null,
      employees: candidate.employees,
      location: candidate.municipality,
      org_number: candidate.org_number,
      website: candidate.website ?? candidate.research?.website ?? null,
      opener_fact: candidate.research?.facts[0]?.fact ?? null,
      opener_source: candidate.research?.facts[0]?.source_url ?? null,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

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
