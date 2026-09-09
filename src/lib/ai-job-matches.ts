import { createClient } from "@/lib/supabase/server";
import { recordSearchRun } from "@/lib/ai-search-runs";
import { fetchLinkedInEmailJobs } from "@/lib/linkedin-email-jobs";

export const LINKEDIN_EMAIL_MODEL = "linkedin-email";

export type AiJobMatch = {
  id: string;
  created_at: string;
  match_date: string;
  title: string;
  company: string | null;
  url: string;
  reasoning: string | null;
  source: string | null;
};

async function fetchLinkedInMatches(): Promise<Omit<AiJobMatch, "id" | "created_at" | "match_date">[]> {
  const jobs = await fetchLinkedInEmailJobs();

  // Recorded for visibility in the spend report even though this path costs
  // nothing — it's not an AI call, just reading real emails LinkedIn sent.
  await recordSearchRun({
    model: LINKEDIN_EMAIL_MODEL,
    inputTokens: 0,
    outputTokens: 0,
    webSearchRequests: 0,
    webFetchRequests: 0,
    matchesFound: jobs.length,
  });

  return jobs.map((job) => ({
    title: job.title,
    company: job.company,
    url: job.url,
    reasoning: null,
    source: "linkedin",
  }));
}

// Runs at most once per day — subsequent calls on the same day reuse
// whatever was already stored for today's match_date.
export async function getTodaysLinkedInMatches(): Promise<AiJobMatch[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: fetchError } = await supabase
    .from("ai_job_matches")
    .select("*")
    .eq("match_date", today)
    .eq("source", "linkedin")
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("Failed to load LinkedIn AI job matches:", fetchError);
    return [];
  }

  if (existing && existing.length > 0) {
    return existing as AiJobMatch[];
  }

  const matches = await fetchLinkedInMatches();
  if (matches.length === 0) {
    return [];
  }

  const { data: inserted, error: insertError } = await supabase
    .from("ai_job_matches")
    .insert(matches.map((match) => ({ ...match, match_date: today })))
    .select("*");

  if (insertError) {
    console.error("Failed to save LinkedIn AI job matches:", insertError);
    return matches.map((match) => ({
      ...match,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      match_date: today,
    }));
  }

  return (inserted ?? []) as AiJobMatch[];
}
