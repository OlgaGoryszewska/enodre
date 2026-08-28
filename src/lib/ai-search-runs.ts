import { createClient } from "@/lib/supabase/server";

export type AiSearchRun = {
  id: string;
  created_at: string;
  run_date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  web_search_requests: number;
  web_fetch_requests: number;
  matches_found: number;
  estimated_cost_usd: number;
};

// claude-haiku-4-5 list pricing (per million tokens) and the documented web
// search tool rate. Update these if pricing changes.
const INPUT_PRICE_PER_MTOK = 1.0;
const OUTPUT_PRICE_PER_MTOK = 5.0;
const WEB_SEARCH_PRICE_EACH = 0.01;

export function estimateSearchCostUsd(usage: {
  inputTokens: number;
  outputTokens: number;
  webSearchRequests: number;
}): number {
  const inputCost = (usage.inputTokens / 1_000_000) * INPUT_PRICE_PER_MTOK;
  const outputCost = (usage.outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MTOK;
  const searchCost = usage.webSearchRequests * WEB_SEARCH_PRICE_EACH;
  return inputCost + outputCost + searchCost;
}

export async function recordSearchRun(run: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  webSearchRequests: number;
  webFetchRequests: number;
  matchesFound: number;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_search_runs").insert({
    model: run.model,
    input_tokens: run.inputTokens,
    output_tokens: run.outputTokens,
    web_search_requests: run.webSearchRequests,
    // web_fetch isn't separately metered — fetched page content is just
    // billed as input tokens, already covered above — so it's tracked here
    // for visibility only and doesn't factor into the cost estimate.
    web_fetch_requests: run.webFetchRequests,
    matches_found: run.matchesFound,
    estimated_cost_usd: estimateSearchCostUsd({
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      webSearchRequests: run.webSearchRequests,
    }),
  });

  if (error) {
    console.error("Failed to record AI search run:", error);
  }
}

export async function getLatestSearchRun(model?: string): Promise<AiSearchRun | null> {
  const supabase = await createClient();
  let query = supabase.from("ai_search_runs").select("*");
  if (model) query = query.eq("model", model);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load latest AI search run:", error);
    return null;
  }

  return data as AiSearchRun | null;
}

export async function getMonthToDateSpendUsd(model?: string): Promise<number> {
  const supabase = await createClient();
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const monthStart = firstOfMonth.toISOString().slice(0, 10);

  let query = supabase.from("ai_search_runs").select("estimated_cost_usd").gte("run_date", monthStart);
  if (model) query = query.eq("model", model);

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load month-to-date AI search spend:", error);
    return 0;
  }

  return (data ?? []).reduce((total, row) => total + Number(row.estimated_cost_usd), 0);
}
