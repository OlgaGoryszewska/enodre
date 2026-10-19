import { z } from "zod";
import { ACCOUNTING_SYSTEM_VALUES, type AccountingSystem } from "@/lib/potential-customer";

// Keep these values in sync with the checks in supabase/gtm_command_centre.sql.
export const DISCOVERY_STATUS_VALUES = ["booked", "completed", "cancelled"] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUS_VALUES)[number];

// The GTM plan's problem hypotheses — what the week-4 gate counts.
export const PROBLEM_CATEGORY_VALUES = [
  "manual_transfer",
  "incomplete_reports",
  "manual_entry",
  "invoice_delay",
  "scattered_info",
  "software_gap",
  "other",
] as const;
export type ProblemCategory = (typeof PROBLEM_CATEGORY_VALUES)[number];

export const problemCategoryLabels: Record<ProblemCategory, string> = {
  manual_transfer: "Field info moved to the office by hand",
  incomplete_reports: "Incomplete or late job reports",
  manual_entry: "Hours/materials typed in manually",
  invoice_delay: "Delay between finished job and invoice",
  scattered_info: "Info spread over sheets, email, systems",
  software_gap: "Current software doesn't fit the workflow",
  other: "Something else",
};

export const PILOT_INTEREST_VALUES = ["unknown", "no", "maybe", "yes"] as const;
export type PilotInterest = (typeof PILOT_INTEREST_VALUES)[number];

export const pilotInterestLabels: Record<PilotInterest, string> = {
  unknown: "Not discussed",
  no: "No",
  maybe: "Maybe",
  yes: "Yes",
};

export type DiscoveryCall = {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  status: DiscoveryStatus;
  scheduled_on: string | null;
  completed_on: string | null;
  problem_description: string | null;
  current_workflow: string | null;
  hours_per_week: number | null;
  accounting_system: AccountingSystem | null;
  systems: string | null;
  problem_categories: ProblemCategory[];
  main_bottleneck: string | null;
  frequency: string | null;
  business_impact: string | null;
  decision_maker: string | null;
  pilot_interest: PilotInterest;
  next_action: string | null;
  follow_up_on: string | null;
  notes: string | null;
};

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

// What the call editor saves. Everything is optional while a call is being
// written up; completing a call has stricter rules (completionProblems).
export const discoveryCallSchema = z.object({
  scheduled_on: z.iso.date().nullable(),
  problem_description: text(4000),
  current_workflow: text(4000),
  hours_per_week: z.number().min(0).max(200).nullable(),
  accounting_system: z.enum(ACCOUNTING_SYSTEM_VALUES).nullable(),
  systems: text(500),
  problem_categories: z.array(z.enum(PROBLEM_CATEGORY_VALUES)).max(PROBLEM_CATEGORY_VALUES.length),
  main_bottleneck: text(1000),
  frequency: text(300),
  business_impact: text(1000),
  decision_maker: text(200),
  pilot_interest: z.enum(PILOT_INTEREST_VALUES),
  next_action: text(300),
  follow_up_on: z.iso.date().nullable(),
  notes: text(4000),
});

export type DiscoveryCallInput = z.input<typeof discoveryCallSchema>;

/**
 * Why a call can't be marked completed yet. The gate only counts complete
 * interviews, so a completed call needs the customer's own description of the
 * problem, the hours it takes, and at least one problem category.
 */
export function completionProblems(
  values: Pick<DiscoveryCallInput, "problem_description" | "hours_per_week" | "problem_categories">
) {
  const problems: string[] = [];
  if (!values.problem_description?.trim()) problems.push("the problem in their words");
  if (values.hours_per_week == null) problems.push("hours per week");
  if (values.problem_categories.length === 0) problems.push("at least one problem category");
  return problems;
}

// Interview guide shown beside the form — from the GTM plan's script.
export const INTERVIEW_GUIDE: { title: string; questions: string[] }[] = [
  {
    title: "Current workflow",
    questions: [
      "What happens when a field job is completed?",
      "Who records the hours, materials and work performed?",
      "Where is that information stored?",
      "How does it reach the office?",
      "Who prepares the invoice?",
      "Which accounting or operational systems do you use?",
    ],
  },
  {
    title: "Pain and impact",
    questions: [
      "How much time goes on this admin each week?",
      "How often are there delays?",
      "Are invoices ever late or missed?",
      "How are incomplete reports handled?",
      "Which part of the process frustrates you most?",
    ],
  },
  {
    title: "Qualification",
    questions: [
      "Is this a recurring problem?",
      "Is it important enough to solve now?",
      "Who owns this process?",
      "Who would take part in a pilot?",
      "What would a successful improvement look like?",
    ],
  },
];
