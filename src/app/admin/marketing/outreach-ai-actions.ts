"use server";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PRICE, RESEARCH_MODEL } from "@/lib/lead-research";
import { RESEARCH_BUDGET, canStartResearch, startOfMonthIso } from "@/lib/lead-candidate";
import { PLAYBOOKS } from "@/lib/industry-playbooks";
import { MESSAGE_KIND_VALUES, MESSAGE_LANGUAGE_VALUES, leadIndustry, verifiedFacts } from "@/lib/outreach-templates";
import type { PotentialCustomer } from "@/lib/potential-customer";

// Drafts one outreach message with Claude from the lead's VERIFIED facts and
// its industry playbook. No web access — it can only use what's on record.
// Logged in the same monthly ledger as research, so the $10 cap covers both.

const draftSchema = z.object({
  subject: z.string().nullable().describe("Email subject, or null for LinkedIn/phone messages."),
  body: z.string().describe("The message, ready to edit. Plain text, short paragraphs."),
  facts_used: z.array(z.string()).describe("Each verified fact the message relies on, copied exactly. Empty if none."),
});

const SYSTEM = `You write one short B2B outreach message for Enodre, a small Norwegian software studio. Enodre has two offers; the brief says which one applies:
- Field-service companies: Enodre helps automate repetitive administrative work and connect workflows between field operations and the office.
- Partners (agencies, software houses, consultancies with their own clients): Enodre works as extra development and UX capacity — white-label under their brand or embedded in their team — and the client stays theirs. Ask how they handle capacity peaks or whether they use subcontractors; never imply they can't deliver.

Rules:
- Use ONLY the verified facts given. Never add numbers, names, customers, events or problems that aren't in them. If no fact is given, open plainly and honestly (who you are, why you're writing) — never pretend to know something.
- Structure for a first message: (A) one specific observation from a verified fact, in your own words; (B) one question about one or two workflows relevant to their industry — ask, never state they have a problem; (C) one plain sentence on how Enodre helps; (D) a small, low-pressure ask for a 5-minute talk ("Er du åpen for en kort prat på 5 minutter?" / "Would you be open to a quick 5-minute chat?") — never a longer meeting or a demo.
- Follow-up: short, polite, add context or ask a slightly different question — don't repeat the first message. Final follow-up: very short, make it easy to reply or decline.
- Connection note: under 300 characters.
- Natural, professional language as a real person writes it. No buzzwords ("AI-drevet", "revolusjonerende"), no flattery, no exclamation marks in Norwegian.
- Norwegian = bokmål with correct word order (verb second: "I Enodre hjelper vi …"). Sign off "Olga, Enodre".`;

const inputSchema = z.object({
  leadId: z.uuid(),
  kind: z.enum(MESSAGE_KIND_VALUES),
  language: z.enum(MESSAGE_LANGUAGE_VALUES),
});

export type GenerateDraftResult =
  { ok: true; subject: string | null; body: string; costUsd: number } | { ok: false; error: string };

export async function generateOutreachDraft(input: z.input<typeof inputSchema>): Promise<GenerateDraftResult> {
  const values = inputSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Same budget as research — enforced here, not just in the UI.
  const { data: runs } = await supabase
    .from("lead_research_runs")
    .select("cost_usd")
    .gte("created_at", startOfMonthIso());
  const spent = (runs ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0);
  if (!canStartResearch(spent)) {
    return {
      ok: false,
      error: `Monthly AI budget reached ($${spent.toFixed(2)} of $${RESEARCH_BUDGET.monthlyUsd}). Use the template instead.`,
    };
  }

  const { data: leadRow, error: leadError } = await supabase
    .from("potential_customers")
    .select("*")
    .eq("id", values.leadId)
    .single();
  if (leadError) return { ok: false, error: "Couldn't load the lead." };
  const lead = leadRow as PotentialCustomer;
  const playbook = PLAYBOOKS[leadIndustry(lead)];
  const facts = verifiedFacts(lead);

  const brief = [
    `Message type: ${values.kind}. Language: ${values.language === "no" ? "Norwegian (bokmål)" : "English"}.`,
    `Offer: ${leadIndustry(lead) === "agency_partner" ? "partner (extra development and UX capacity)" : "field-service workflow automation"}.`,
    lead.country === "PL" &&
      "The company is in Poland: keep the first contact a genuine question with a small ask — no sales pitch, no prices.",
    `Company: ${lead.company || lead.name}. Contact: ${lead.name !== lead.company ? lead.name : "unknown"}.`,
    `Industry: ${playbook.label}. Typical workflow (hypothesis, not a fact about them): ${playbook.workflow.join(" → ")}.`,
    `Questions you may adapt: ${playbook.openingQuestions.map((q) => q[values.language]).join(" | ")}`,
    `Value sentence you may adapt: ${playbook.value[values.language]}`,
    facts.length
      ? `Verified facts (the only facts you may use):\n${facts.map((f) => `- ${f.fact} (source: ${f.source_url})`).join("\n")}`
      : "Verified facts: none. Use a plain, honest opening.",
  ]
    .filter(Boolean)
    .join("\n");

  let costUsd = 0;
  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: RESEARCH_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(draftSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: brief }],
    });
    const usage = response.usage;
    costUsd =
      usage.input_tokens * PRICE.input +
      usage.output_tokens * PRICE.output +
      (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
      (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite;
    await supabase.from("lead_research_runs").insert({
      candidate_id: null,
      outcome: "drafted",
      model: RESEARCH_MODEL,
      cost_usd: costUsd,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      api_requests: 1,
    });
    if (response.stop_reason === "refusal")
      return { ok: false, error: "Claude declined to write this message. Use the template." };
    if (!response.parsed_output)
      return { ok: false, error: "Claude didn't return a usable draft. Try again or use the template." };
    return { ok: true, subject: response.parsed_output.subject, body: response.parsed_output.body, costUsd };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("Outreach draft generation failed:", error);
    if (/credit balance/i.test(message))
      return { ok: false, error: "The Anthropic account is out of credits. Use the template, or add credits." };
    if (/api key|authentication/i.test(message))
      return { ok: false, error: "The Anthropic API key isn't set up for this environment." };
    return { ok: false, error: "Couldn't generate a draft right now. The template still works." };
  }
}

// ---------------------------------------------------------------------------
// The opening sentence (part A), written once per lead from a verified fact
// and saved on the lead, so later messages reuse it at no cost.

const openerSchema = z.object({
  opener_fact: z.string().describe("The one verified fact used, copied exactly from the list."),
  opener_no: z
    .string()
    .describe("One natural Norwegian bokmål sentence observing that fact, e.g. starting “Jeg så at …”."),
  opener_en: z.string().describe("The same sentence in English."),
});

const OPENER_SYSTEM = `You write the first sentence of a B2B outreach message: one short, natural observation about the company, based on ONE of the verified facts given.

Rules:
- Use only that fact. Add nothing — no numbers, names, opinions or problems that aren't in it.
- No flattery ("imponerende", "fantastisk") and no exclamation marks. Sound like a person who read their website.
- Norwegian: bokmål, correct word order, e.g. "Jeg så at dere …" / "Jeg la merke til at …". English: "I saw that you …".
- Pick the fact most relevant to how the company works day to day (services, field work, growth, hiring, locations).`;

export type GenerateOpenerResult =
  | { ok: true; opener_no: string; opener_en: string; fact: string; costUsd: number; saved: boolean }
  | { ok: false; error: string };

export async function generateOpener(leadId: string): Promise<GenerateOpenerResult> {
  const id = z.uuid().parse(leadId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: leadRow, error: leadError } = await supabase
    .from("potential_customers")
    .select("*")
    .eq("id", id)
    .single();
  if (leadError) return { ok: false, error: "Couldn't load the lead." };
  const lead = leadRow as PotentialCustomer;
  const facts = verifiedFacts(lead);
  if (facts.length === 0) return { ok: false, error: "No verified facts yet — add one with its source first." };

  const { data: runs } = await supabase
    .from("lead_research_runs")
    .select("cost_usd")
    .gte("created_at", startOfMonthIso());
  const spent = (runs ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0);
  if (!canStartResearch(spent)) {
    return { ok: false, error: `Monthly AI budget reached ($${spent.toFixed(2)} of $${RESEARCH_BUDGET.monthlyUsd}).` };
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: RESEARCH_MODEL,
      max_tokens: 1000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(openerSchema) },
      system: OPENER_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Company: ${lead.company || lead.name}\nVerified facts:\n${facts.map((f) => `- ${f.fact}`).join("\n")}`,
        },
      ],
    });
    const usage = response.usage;
    const costUsd = usage.input_tokens * PRICE.input + usage.output_tokens * PRICE.output;
    await supabase.from("lead_research_runs").insert({
      candidate_id: null,
      outcome: "drafted",
      model: RESEARCH_MODEL,
      cost_usd: costUsd,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      api_requests: 1,
    });
    const result = response.parsed_output;
    if (response.stop_reason === "refusal" || !result)
      return { ok: false, error: "Couldn't write an opening. Write it yourself." };
    // Only accept an opening tied to a fact that's actually on record.
    const fact = facts.find((f) => f.fact.trim() === result.opener_fact.trim())?.fact;
    if (!fact) return { ok: false, error: "The suggested opening didn't match a verified fact — write it yourself." };

    // Save it on the lead (needs the research column from outreach_system.sql).
    let saved = false;
    if (lead.research !== undefined) {
      const research = {
        ...(lead.research ?? {}),
        opener_fact: fact,
        opener_no: result.opener_no,
        opener_en: result.opener_en,
      };
      const { error } = await supabase
        .from("potential_customers")
        .update({ research, updated_at: new Date().toISOString() })
        .eq("id", id);
      saved = !error;
      if (saved) revalidatePath("/admin/marketing", "layout");
    }
    return { ok: true, opener_no: result.opener_no, opener_en: result.opener_en, fact, costUsd, saved };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("Opener generation failed:", error);
    if (/credit balance/i.test(message)) return { ok: false, error: "The Anthropic account is out of credits." };
    return { ok: false, error: "Couldn't write the opening right now." };
  }
}
