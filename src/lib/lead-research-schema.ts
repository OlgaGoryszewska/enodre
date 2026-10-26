import { z } from "zod";

// Structured output of the Researcher agent. Field descriptions are sent to
// Claude as part of the JSON schema, so they double as instructions.
export const leadResearchSchema = z.object({
  website: z.string().nullable().describe("The company's own website URL, or null if none was found."),
  summary: z.string().describe("English, 1–2 sentences: what the company does, for whom, and where."),
  facts: z
    .array(
      z.object({
        fact: z.string().describe("English. One concrete, verifiable fact about the company."),
        source_url: z.string().describe("The exact URL where this fact was found."),
      })
    )
    .describe("Only facts actually read in a source during this research. Never inferred."),
  signals: z
    .array(
      z.object({
        signal: z
          .string()
          .describe("English. A buying signal: growth, hiring, Gaselle award, new contracts, many sites, etc."),
        source_url: z.string(),
      })
    )
    .describe("Empty if none were found."),
  likely_pain: z
    .string()
    .describe(
      "English. The repetitive manual workflow most likely costing them time — the one to automate first. A hypothesis."
    ),
  pain_evidence: z
    .string()
    .describe("English. Why we think so, pointing to the facts/signals. Say plainly if evidence is thin."),
  how_we_help: z
    .string()
    .describe("English, one sentence: how we'd automate that workflow. Plain language, no product names."),
  fit_score: z.number().int().describe("1–5 fit for Enodre's offer, using the rubric in the instructions."),
  fit_reason: z.string().describe("English, one sentence."),
  confidence: z.enum(["high", "medium", "low"]).describe("How well-supported the research is."),
  opener_fact: z
    .string()
    .nullable()
    .describe(
      "The one fact (copied exactly from `facts`) the opening sentence is based on, or null if no fact is reliable."
    ),
  opener_no: z
    .string()
    .nullable()
    .describe(
      'Part A only: one natural Norwegian sentence observing opener_fact, e.g. "Jeg så at …". Null if opener_fact is null.'
    ),
  opener_en: z.string().nullable().describe("The same opening sentence in English. Null if opener_fact is null."),
  message_no: z.string().describe("The outreach message in Norwegian bokmål, following the required structure."),
  message_en: z.string().describe("A faithful English translation of message_no."),
});

export type LeadResearch = z.infer<typeof leadResearchSchema>;
