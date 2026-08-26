import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { services } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

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

const MAX_MATCHES = 5;

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

const SYSTEM_PROMPT = `
You are a job-matching research assistant. Use web search to find real, currently open job or
contract postings on Upwork and LinkedIn that are strong matches for the profile and
specializations below. Prefer freelance/contract engagements and remote-friendly roles.

Only include postings you actually found via search, with real working URLs copied from the search
results. Never invent a listing, company, or URL.

<profile>
${PROFILE_SUMMARY}
</profile>

<enodre_specializations>
Olga also runs Enodre, a small studio offering these services, so contract/consulting work in these
areas is also a strong match:
${ENODRE_SPECIALIZATIONS}
</enodre_specializations>

Return up to ${MAX_MATCHES} of today's best matches. For each, write a one-sentence reasoning tying
it to specific parts of the profile above.

End your response with a fenced \`\`\`json code block containing ONLY a JSON array (no wrapping
object, no other text inside the block) of objects shaped like:
{"title": string, "company": string, "url": string, "reasoning": string, "source": "upwork" | "linkedin"}

If you find no strong matches, return an empty array in that code block. Do not fabricate listings.
`.trim();

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

async function searchForMatches(): Promise<Omit<AiJobMatch, "id" | "created_at" | "match_date">[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY env var — can't search for job matches.");
    return [];
  }

  const client = new Anthropic({ apiKey });

  // Haiku 4.5 keeps this cheap: it's the lowest-cost model tier, doesn't run
  // (billed) thinking unless explicitly enabled, and this task — search plus
  // short extraction — doesn't need Opus-tier reasoning. Haiku isn't on the
  // dynamic-filtering web search tool's supported-model list, so this uses
  // the basic web_search_20250305 variant instead of _20260209.
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 4,
        allowed_domains: ["upwork.com", "linkedin.com"],
      },
    ],
    messages: [{ role: "user", content: "Find today's best job/contract matches." }],
  });

  if (response.stop_reason === "refusal") {
    console.error("Claude declined the job-match search request.");
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
    console.error("Failed to parse job match JSON from Claude's response:", error);
    return [];
  }

  const results = z.array(matchSchema).safeParse(parsed);
  if (!results.success) {
    console.error("Job match JSON didn't match the expected shape:", results.error);
    return [];
  }

  // Anti-hallucination guardrail: only trust a URL Claude actually saw in a
  // real search result this run. Individual Upwork/LinkedIn job postings are
  // largely login-walled and not indexed, so search mostly surfaces generic
  // category pages — without this check the model can (and did, in testing)
  // fill the gap with a plausible-looking but fabricated listing URL.
  const realUrls = new Set(
    response.content
      .filter(
        (block): block is Anthropic.WebSearchToolResultBlock =>
          block.type === "web_search_tool_result"
      )
      .flatMap((block) => (Array.isArray(block.content) ? block.content : []))
      .map((result) => result.url)
  );

  return results.data
    .filter((match) => realUrls.has(match.url))
    .slice(0, MAX_MATCHES)
    .map((match) => ({
      title: match.title,
      company: match.company || null,
      url: match.url,
      reasoning: match.reasoning || null,
      source: match.source || null,
    }));
}

// Runs the search at most once per day — subsequent calls on the same day
// reuse whatever was already stored for today's match_date.
export async function getTodaysAiJobMatches(): Promise<AiJobMatch[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: fetchError } = await supabase
    .from("ai_job_matches")
    .select("*")
    .eq("match_date", today)
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("Failed to load AI job matches:", fetchError);
    return [];
  }

  if (existing && existing.length > 0) {
    return existing as AiJobMatch[];
  }

  const matches = await searchForMatches();
  if (matches.length === 0) {
    return [];
  }

  const { data: inserted, error: insertError } = await supabase
    .from("ai_job_matches")
    .insert(matches.map((match) => ({ ...match, match_date: today })))
    .select("*");

  if (insertError) {
    console.error("Failed to save AI job matches:", insertError);
    return matches.map((match) => ({
      ...match,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      match_date: today,
    }));
  }

  return (inserted ?? []) as AiJobMatch[];
}
