import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { leadResearchSchema, type LeadResearch } from "@/lib/lead-research-schema";
import { RESEARCH_BUDGET, isFuelFloSimilar } from "@/lib/lead-candidate";

// Server-only: imported from server actions. Needs ANTHROPIC_API_KEY.

export const RESEARCH_MODEL = "claude-opus-5-5";
// Claude Opus 5.5 list prices (USD per token) + web search ($10 / 1,000).
// Estimates only: a fallback model may serve some requests at its own rates.
export const PRICE = {
  input: 4 / 1_000_000,
  output: 20 / 1_000_000,
  cacheWrite: 5 / 1_000_000,
  cacheRead: 0.2 / 1_000_000,
  webSearch: 10 / 1_000,
};
// Server-tool loops can pause; resume a couple of times, then give up.
const MAX_CONTINUATIONS = 2;
// Most of the cost is input tokens: every search result and fetched page is
// read into context. These caps bound how much one company can pull in.
const TOOL_LIMITS = {
  webSearches: 3,
  webFetches: 3,
  // Per fetched page — long pages are truncated rather than read in full.
  fetchMaxContentTokens: 6000,
};

const SYSTEM_PROMPT = `You research one Norwegian company at a time for Enodre, a small software studio, and draft a first outreach message to its daglig leder.

## What Enodre offers
Enodre helps companies automate repetitive administrative work and connect workflows between field operations and the office — starting with field-service companies (people working out on jobs: groundwork, machinery rental, haulage, electricians, plumbers, cleaning). We map how a workflow actually runs, then automate its repetitive steps inside the systems the company already uses. Typical workflows:
- field reporting: hours, materials, photos, checklists and job documentation
- information typed in more than once (field app → spreadsheet → accounting system)
- orders, scheduling and dispatch, and keeping customers updated
- reports for customers or authorities (HMS/KS documentation)
- invoicing after finished jobs — one example among many, not the default
Anything unusual still goes to a person for approval. Enodre connects to existing systems rather than replacing them.

For fuel distribution, generator/equipment rental and equipment service companies the same idea applies to deliveries, refuels and service visits: logging them in the field, documentation, client reports and follow-up.

## Reference work (only when the user message says it applies)
Enodre has built a field-to-report system for fuel delivery to generators and temporary power sites: every delivery is verified with GPS, timestamp and photo, and client reports are generated in seconds instead of hours. It is built and pilot-ready, not yet in use by paying customers. When told it applies, you may mention in the message — in one short clause, in plain words — that Enodre has built a similar system for fuel delivery and generator operations. Never name the product, and never claim customers, results or time savings from it.

## How to research (on a tight budget)
You have at most ${TOOL_LIMITS.webSearches} web searches and ${TOOL_LIMITS.webFetches} page fetches. Spend them deliberately:
1. Read the company's own website first — the front page, plus one services/about/news page if needed (services, customer types, area, size, news).
2. Use the remaining searches for public signals: growth, hiring (especially office/admin or many field roles), Gaselle awards, new contracts, multiple locations.
3. Stop as soon as you have enough for a specific opener and a grounded pain hypothesis. Don't keep searching to be thorough — a shorter, accurate result is better than a longer one.

## Rules for facts
- Only record a fact if you actually read it in a source during this research, and give that exact URL.
- Never invent numbers, names, customers or events. If you couldn't find something, leave it out.
- The register data in the user message is reliable and may be used without a URL in the message, but don't list it as a researched fact.

## Likely pain
Name the one repetitive manual workflow most likely to be costing them time — the daily or weekly routine you'd automate first — as a hypothesis, and explain the evidence (their services, job ads, number of sites, size). Don't default to invoicing; pick what the evidence points to. If evidence is thin, say so and lower confidence.

## Fit score (1–5)
5 = many small field jobs with repetitive reporting and admin around them, growing, and visible signs of admin strain.
4 = clearly a field-job business with recurring routines (reports, orders, documentation), some growth signal.
3 = field work, but fewer/larger projects or little evidence.
2 = mostly something else (e.g. retail, pure office work, very large projects only).
1 = not a fit (no field work, or not a real operating company).

## The message (message_no)
Norwegian bokmål, addressed by first name to the contact person given. Four short parts:
A. One specific, verifiable observation from the facts you recorded (a new service, expansion, hiring, a new location, a relevant process). If you found no reliable fact, open plainly and honestly instead — never invent one.
B. One question about one or two workflows relevant to their industry (e.g. how technicians report finished jobs, how job documentation reaches the office, how hours and service reports are handled). Ask — never state that they have a problem.
C. One plain sentence on how Enodre helps, e.g. "I Enodre hjelper vi bedrifter med å forenkle arbeidsflyten mellom felt og kontor, slik at mindre tid går til dobbeltarbeid og manuell registrering." Adapt it to the workflow you asked about.
D. A small, low-pressure closing ask: "Er du åpen for en kort prat på 5 minutter?" — not a longer meeting or a demo.
Also return part A on its own: opener_fact (the fact used, copied exactly), opener_no and opener_en (the opening sentence in each language) — or null for all three if no fact is reliable.
Sign off as "Olga, Enodre". Natural Norwegian with correct word order (verb second: "I Enodre hjelper vi …"). No buzzwords, no exaggeration, no flattery beyond the one observation.`;

export type LeadResearchInput = {
  company: string;
  orgNumber: string;
  industryCode: string | null;
  industryLabel: string | null;
  employees: number | null;
  municipality: string | null;
  address: string | null;
  website: string | null;
  founded: string | null;
  contactName: string | null;
  contactRole: string | null;
};

export type ResearchUsage = {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  webSearchRequests: number;
  webFetchRequests: number;
  apiRequests: number;
};

export type LeadResearchResult = {
  research: LeadResearch;
  usage: ResearchUsage;
};

/** Thrown for any failed run — carries what the run spent so it's still recorded. */
export class LeadResearchError extends Error {
  readonly usage: ResearchUsage;
  readonly overBudget: boolean;

  constructor(message: string, usage: ResearchUsage, overBudget = false) {
    super(message);
    this.name = "LeadResearchError";
    this.usage = usage;
    this.overBudget = overBudget;
  }
}

export async function researchLead(input: LeadResearchInput): Promise<LeadResearchResult> {
  const client = new Anthropic();

  const registerData = [
    `Company: ${input.company}`,
    `Org number: ${input.orgNumber}`,
    input.industryLabel && `Industry (register): ${input.industryLabel}`,
    input.employees != null && `Employees (register): ${input.employees}`,
    input.municipality && `Municipality: ${input.municipality}`,
    input.address && `Address: ${input.address}`,
    input.founded && `Founded: ${input.founded}`,
    input.website && `Website (register): ${input.website}`,
    input.contactName && `Contact: ${input.contactName}${input.contactRole ? ` (${input.contactRole})` : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
  // Kept out of the system prompt so the system prompt stays identical across
  // companies (cacheable).
  const referenceNote = isFuelFloSimilar(input.industryCode)
    ? "The reference work applies to this company's industry — you may mention it as instructed."
    : "The reference work does not apply to this company — don't mention it.";

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Research this company and draft the outreach message.\n\nRegister data (Brønnøysundregistrene):\n${registerData}\n\n${referenceNote}`,
    },
  ];

  const usage: ResearchUsage = {
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    webSearchRequests: 0,
    webFetchRequests: 0,
    apiRequests: 0,
  };

  for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
    let response;
    try {
      response = await client.beta.messages.parse({
        model: RESEARCH_MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
          effort: "medium",
          format: betaZodOutputFormat(leadResearchSchema),
        },
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: TOOL_LIMITS.webSearches,
            user_location: { type: "approximate", country: "NO" },
          },
          {
            type: "web_fetch_20260209",
            name: "web_fetch",
            max_uses: TOOL_LIMITS.webFetches,
            max_content_tokens: TOOL_LIMITS.fetchMaxContentTokens,
          },
        ],
        messages,
      });
    } catch (error) {
      throw new LeadResearchError(error instanceof Error ? error.message : "Claude API request failed.", usage);
    }

    const responseUsage = response.usage;
    usage.apiRequests += 1;
    usage.inputTokens += responseUsage.input_tokens;
    usage.outputTokens += responseUsage.output_tokens;
    usage.cacheReadTokens += responseUsage.cache_read_input_tokens ?? 0;
    usage.cacheWriteTokens += responseUsage.cache_creation_input_tokens ?? 0;
    usage.webSearchRequests += responseUsage.server_tool_use?.web_search_requests ?? 0;
    usage.webFetchRequests += responseUsage.server_tool_use?.web_fetch_requests ?? 0;
    usage.costUsd =
      usage.inputTokens * PRICE.input +
      usage.outputTokens * PRICE.output +
      usage.cacheWriteTokens * PRICE.cacheWrite +
      usage.cacheReadTokens * PRICE.cacheRead +
      usage.webSearchRequests * PRICE.webSearch;

    if (response.stop_reason === "pause_turn") {
      // Hard stop: don't resume a run that has already passed the cap.
      if (usage.costUsd >= RESEARCH_BUDGET.perCompanyUsd) {
        throw new LeadResearchError(
          `Stopped: passed the $${RESEARCH_BUDGET.perCompanyUsd.toFixed(2)} per-company cap.`,
          usage,
          true
        );
      }
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") {
      throw new LeadResearchError("Claude declined to research this company.", usage);
    }
    if (response.stop_reason === "max_tokens") {
      throw new LeadResearchError("Research was cut off (max_tokens).", usage);
    }
    if (!response.parsed_output) {
      throw new LeadResearchError("Research finished without a valid structured result.", usage);
    }

    return { research: response.parsed_output, usage };
  }

  throw new LeadResearchError("Research didn't finish after the allowed continuations.", usage);
}
