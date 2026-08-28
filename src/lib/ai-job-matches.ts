import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { services } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { recordSearchRun } from "@/lib/ai-search-runs";
import { fetchLinkedInEmailJobs } from "@/lib/linkedin-email-jobs";

const MODEL = "claude-haiku-4-5";
// Exported so pages can filter ai_search_runs by source when showing a
// per-platform spend report.
export const UPWORK_SEARCH_MODEL = MODEL;
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

const MAX_MATCHES_PER_SOURCE = 5;

type Source = {
  key: "upwork";
  label: string;
  domain: string;
};

// LinkedIn isn't AI-searched here — its web_fetch tool categorically blocks
// every job-page URL (confirmed live: url_not_allowed on every attempt), so
// there's no way to verify a search result is a real, current posting.
// LinkedIn matches instead come from fetchLinkedInEmailJobs(), which reads
// real job-alert emails LinkedIn already sent — see getTodaysAiJobMatches.
const SOURCES: Source[] = [{ key: "upwork", label: "Upwork", domain: "upwork.com" }];

const PROFILE_SUMMARY = `
Olga Goryszewska — Product Engineer (Frontend & UX), based in Bergen, Norway, open to remote work.

Summary: Product engineer who designs and builds full-scale SaaS products end to end — product
discovery, UX research, system architecture, frontend engineering, and backend integration. Sole
product engineer behind FuelFlo, a multi-platform offline-first SaaS platform for infrastructure/event
fuel operations (Next.js web ops portal, installable PWA field fallback, React Native iOS/Android apps,
shared Supabase/PostgreSQL backend with role-based access, offline sync, and audit reporting).

Core skills: React, React Native, Next.js, TypeScript, Tailwind CSS, PWA, REST/GraphQL, Figma, UX
research, wireframing, design systems, accessibility (WCAG), Supabase/PostgreSQL, Vercel/Netlify,
Git, Jest/Cypress, CI/CD.

Freelance experience (2024–present): partners directly with founders/business stakeholders to turn
operational requirements into production-ready SaaS products — discovery through deployment.

Looking for: frontend/product engineering roles or freelance/contract projects — SaaS product builds,
React/Next.js development, UX-to-engineering handoff work, product design + build engagements.
`.trim();

const ENODRE_SPECIALIZATIONS = services
  .map((service) => `- ${service.title}: ${service.summary}`)
  .join("\n");

function buildSystemPrompt(source: Source): string {
  return `
You are a job-matching research assistant. Use web search to find real job or contract postings
specifically on ${source.domain} that are strong matches for the profile and specializations below.
Prefer freelance/contract engagements and remote-friendly roles.

Most search results for job sites are generic category/list pages ("4,000+ React Jobs...") rather
than individual postings, and even when you find an individual posting URL, the search index's
cached snapshot of it can be years out of date — the listing may already be filled, closed, or
removed. Do not trust a URL's presence in search results alone as proof it's a real, current opening.

Before including any listing in your final answer, use web_fetch to open its URL and confirm, from
the actual live page content:
- It is a single job/contract posting, not a category or search-results page.
- Nothing on the page indicates it's closed, expired, filled, or no longer accepting applications.
- If the page shows a posted/updated date, it looks recent (roughly within the last few weeks) —
  not several months or years old.

If a fetch fails, is blocked (e.g. by a login wall), or the content doesn't clearly confirm the
listing is live, drop that listing rather than include it unverified. It is completely fine to
return fewer than ${MAX_MATCHES_PER_SOURCE} matches, or zero, if you can't verify enough — never pad
the list with anything you haven't confirmed is real and current.

<profile>
${PROFILE_SUMMARY}
</profile>

<enodre_specializations>
Olga also runs Enodre, a small studio offering these services, so contract/consulting work in these
areas is also a strong match:
${ENODRE_SPECIALIZATIONS}
</enodre_specializations>

Return up to ${MAX_MATCHES_PER_SOURCE} of today's best, verified-current matches on ${source.label}.
For each, write a one-sentence reasoning tying it to specific parts of the profile above.

End your response with a fenced \`\`\`json code block containing ONLY a JSON array (no wrapping
object, no other text inside the block) of objects shaped like:
{"title": string, "company": string, "url": string, "reasoning": string, "source": "${source.key}"}

If you find no strong, verified matches, return an empty array in that code block. Do not fabricate
listings, and do not include anything you weren't able to verify via web_fetch.
`.trim();
}

const matchSchema = z.object({
  title: z.string().min(1),
  company: z.string().optional().default(""),
  url: z.url(),
  reasoning: z.string().optional().default(""),
  source: z.string().optional().default(""),
});

function extractJsonBlock(text: string): unknown {
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = match ? match[1] : text;
  return JSON.parse(raw);
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

// A fetch can return HTTP 200 while the site quietly redirected to a generic
// category/homepage instead of the actual posting (observed live: Upwork
// does this for unauthenticated fetches). The requested URL alone doesn't
// catch that — but the fetched page's own "canonical:" metadata does, so
// only count a fetch as a real verification when that canonical URL still
// points at the page we asked for.
function getFetchVerifiedUrls(response: Anthropic.Message): Set<string> {
  const verified = new Set<string>();

  for (const block of response.content) {
    if (block.type !== "web_fetch_tool_result") continue;
    if (block.content.type !== "web_fetch_result") continue;

    const source = block.content.content.source;
    if (source.type !== "text") continue;

    const canonicalMatch = source.data.match(/^canonical:\s*(\S+)/m);
    if (!canonicalMatch) continue;

    if (normalizeUrl(canonicalMatch[1]) === normalizeUrl(block.content.url)) {
      verified.add(normalizeUrl(block.content.url));
    }
  }

  return verified;
}

function parseMatchesFromResponse(
  response: Anthropic.Message,
  source: Source
): Omit<AiJobMatch, "id" | "created_at" | "match_date">[] {
  if (response.stop_reason === "refusal") {
    console.error(`Claude declined the ${source.label} job-match search request.`);
    return [];
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  let parsed: unknown;
  try {
    parsed = extractJsonBlock(text);
  } catch (error) {
    console.error(`Failed to parse ${source.label} job match JSON from Claude's response:`, error);
    return [];
  }

  const results = z.array(matchSchema).safeParse(parsed);
  if (!results.success) {
    console.error(`${source.label} job match JSON didn't match the expected shape:`, results.error);
    return [];
  }

  // Anti-hallucination guardrail: only trust a URL Claude actually saw in a
  // real search result this run — without this check the model can (and did,
  // in testing) fill gaps with a plausible-looking but fabricated URL.
  const realUrls = new Set(
    response.content
      .filter(
        (block): block is Anthropic.WebSearchToolResultBlock =>
          block.type === "web_search_tool_result"
      )
      .flatMap((block) => (Array.isArray(block.content) ? block.content : []))
      .map((result) => result.url)
  );

  // Anti-staleness guardrail: also require a successful, non-redirected fetch
  // of that exact URL this run (see getFetchVerifiedUrls). A URL can be real
  // and still point at a listing that's years old or filled — search-result
  // presence alone doesn't prove the posting is current, only that it isn't
  // invented. When a platform blocks fetch entirely (e.g. LinkedIn returns
  // url_not_allowed for every attempt, confirmed in testing), this means
  // matches for that platform will legitimately come back empty rather than
  // unverified — the honest outcome given we can't check them.
  const fetchVerifiedUrls = getFetchVerifiedUrls(response);

  return results.data
    .filter((match) => realUrls.has(match.url) && fetchVerifiedUrls.has(normalizeUrl(match.url)))
    .slice(0, MAX_MATCHES_PER_SOURCE)
    .map((match) => ({
      title: match.title,
      company: match.company || null,
      url: match.url,
      reasoning: match.reasoning || null,
      source: source.key,
    }));
}

async function searchSource(
  source: Source
): Promise<Omit<AiJobMatch, "id" | "created_at" | "match_date">[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY env var — can't search for job matches.");
    return [];
  }

  const client = new Anthropic({ apiKey });

  // Haiku 4.5 keeps this cheap: it's the lowest-cost model tier, doesn't run
  // (billed) thinking unless explicitly enabled, and this task doesn't need
  // Opus-tier reasoning. Haiku isn't on the dynamic-filtering tools' supported
  // model list, so this uses the basic web_search_20250305/web_fetch_20250910
  // variants instead of the _20260209 ones. web_fetch lets the model open a
  // candidate URL and check the live page instead of trusting stale search-
  // index data — search alone was surfacing postings years out of date.
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3072,
    system: buildSystemPrompt(source),
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 4,
        allowed_domains: [source.domain],
      },
      {
        type: "web_fetch_20250910",
        name: "web_fetch",
        max_uses: 5,
        allowed_domains: [source.domain],
        max_content_tokens: 3000,
      },
    ],
    messages: [{ role: "user", content: `Find today's best ${source.label} matches.` }],
  });

  const matches = parseMatchesFromResponse(response, source);

  // Record spend for every real API call, regardless of whether any match
  // survived parsing/validation — money was spent either way.
  await recordSearchRun({
    model: MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    webSearchRequests: response.usage.server_tool_use?.web_search_requests ?? 0,
    webFetchRequests: response.usage.server_tool_use?.web_fetch_requests ?? 0,
    matchesFound: matches.length,
  });

  return matches;
}

async function fetchLinkedInMatches(): Promise<
  Omit<AiJobMatch, "id" | "created_at" | "match_date">[]
> {
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

// Runs a source's search at most once per day — subsequent calls on the
// same day reuse whatever was already stored for today's match_date. Split
// per source (rather than one combined fetch) so visiting just the LinkedIn
// page never triggers an Upwork AI search, and vice versa.
async function getTodaysMatchesForSource(
  sourceKey: string,
  fetchMatches: () => Promise<Omit<AiJobMatch, "id" | "created_at" | "match_date">[]>
): Promise<AiJobMatch[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: fetchError } = await supabase
    .from("ai_job_matches")
    .select("*")
    .eq("match_date", today)
    .eq("source", sourceKey)
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error(`Failed to load ${sourceKey} AI job matches:`, fetchError);
    return [];
  }

  if (existing && existing.length > 0) {
    return existing as AiJobMatch[];
  }

  const matches = await fetchMatches();
  if (matches.length === 0) {
    return [];
  }

  const { data: inserted, error: insertError } = await supabase
    .from("ai_job_matches")
    .insert(matches.map((match) => ({ ...match, match_date: today })))
    .select("*");

  if (insertError) {
    console.error(`Failed to save ${sourceKey} AI job matches:`, insertError);
    return matches.map((match) => ({
      ...match,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      match_date: today,
    }));
  }

  return (inserted ?? []) as AiJobMatch[];
}

export async function getTodaysUpworkMatches(): Promise<AiJobMatch[]> {
  return getTodaysMatchesForSource("upwork", () => searchSource(SOURCES[0]));
}

export async function getTodaysLinkedInMatches(): Promise<AiJobMatch[]> {
  return getTodaysMatchesForSource("linkedin", fetchLinkedInMatches);
}
