// Dashboard summary of the GTM plan. The full plan (and the source of truth)
// is the Claude Doc at GTM_PLAN_URL — update this file when the doc's
// phases, gates or targets change.

export const GTM_PLAN_URL = "https://claude.ai/code/artifact/4321c9dd-2569-4bf9-964c-4fc71b9491c3";

export const GTM_SUMMARY = {
  product: "Jobb-til-faktura — from finished field job to sent invoice the same day, without manual data entry.",
  customers:
    "Norwegian field-service companies, 10–100 employees (groundwork, haulage, electricians, plumbers), plus a FuelFlo-like segment (fuel distribution, generator rental, equipment service).",
  goal: "15+ discovery calls by week 4 · 2–3 signed pilots by week 8 · first pilot live with measured results by week 12.",
};

export type GtmPhase = {
  name: string;
  start: string; // inclusive, YYYY-MM-DD
  end: string; // inclusive, YYYY-MM-DD
  weeks: string;
  work: string[];
  gate: string;
};

export const GTM_PHASES: GtmPhase[] = [
  {
    name: "Discover",
    start: "2026-10-13",
    end: "2026-11-09",
    weeks: "Weeks 1–4",
    work: ["Find and research leads", "20 contacts a week", "15+ discovery calls"],
    gate: "5+ of 15 share one pain at 5+ hours a week",
  },
  {
    name: "Pilot offers",
    start: "2026-11-10",
    end: "2026-12-07",
    weeks: "Weeks 5–8",
    work: ["Process-mapping calls", "One-page pilot proposals", "Price test if no takers"],
    gate: "2–3 pilots signed",
  },
  {
    name: "First pilot",
    start: "2026-12-08",
    end: "2027-01-04",
    weeks: "Weeks 9–12",
    work: ["Build one workflow", "Run it with the customer", "Measure before and after"],
    gate: "Success measure met, case study published",
  },
];

export const GTM_WEEKLY_TARGETS = [
  { label: "Companies researched", target: "~20" },
  { label: "Leads approved", target: "~20" },
  { label: "Contacts made", target: "20" },
  { label: "Discovery calls", target: "3–5" },
  { label: "Research spend", target: "< $10 / month" },
];

/** Index of the phase `today` (YYYY-MM-DD) falls in; -1 before, phases.length after. */
export function currentPhaseIndex(today: string) {
  if (today < GTM_PHASES[0].start) return -1;
  const index = GTM_PHASES.findIndex((phase) => today >= phase.start && today <= phase.end);
  return index === -1 ? GTM_PHASES.length : index;
}

/** 1-based plan week for `today`, or null outside the plan. */
export function currentPlanWeek(today: string) {
  const days = Math.floor((Date.parse(today) - Date.parse(GTM_PHASES[0].start)) / 86_400_000);
  const week = Math.floor(days / 7) + 1;
  return week >= 1 && week <= 12 ? week : null;
}

// The plan as to-dos for the marketing kanban. Titles start with GTM_TASK_PREFIX
// so the board can be re-seeded without duplicates and progress can be counted.
export const GTM_TASK_PREFIX = "GTM · ";

export const GTM_TASKS: { title: string; description: string }[] = [
  // Setup — this week
  { title: "Run lead_candidates.sql in Supabase", description: "Setup, week 1. Creates the lead finder queue and the research spend log." },
  { title: "Add Anthropic credits + monthly spend limit", description: "Setup, week 1. Console → Plans & Billing. The spend limit is the safety net behind the $10/month cap in code." },
  { title: "Add ANTHROPIC_API_KEY to Vercel", description: "Setup, week 1. Needed for the research agent in production." },
  { title: "Send booking/contact emails from info@enodre.com", description: "Setup, week 1. Gmail → Settings → Accounts → Send mail as, or a Workspace app password." },
  // Phase 1 — Discover (weeks 1–4)
  { title: "Find the first 25 companies", description: "Phase 1. Trøndelag, Vestfold, Telemark (A/B) + F segment nationwide." },
  { title: "Research and approve 20 leads", description: "Phase 1, every week. Check every claim and source before approving." },
  { title: "Contact 20 leads this week", description: "Phase 1, every week. LinkedIn by hand or phone; one follow-up after 4–5 days." },
  { title: "Hold 15 discovery calls", description: "Phase 1, by 9 Nov. Use the interview script; write down hours/week, systems, pain in their words." },
  { title: "Week-4 gate review", description: "9 Nov. Do 5+ of 15 share the same pain at 5+ hours a week? If not, switch the workflow." },
  // Phase 2 — Pilot offers (weeks 5–8)
  { title: "Write the one-page pilot proposal template", description: "Phase 2. One workflow, fixed scope, 4–6 weeks, success measure, reduced setup price." },
  { title: "Draft pilot terms with case-study clause", description: "Phase 2. Reduced price in return for a named case study with real numbers." },
  { title: "Process-mapping calls (Olga + Nick)", description: "Phase 2. 45 min with the daglig leder and the person who does invoicing." },
  { title: "Sign 2–3 pilots", description: "Week-8 gate, 7 Dec. If no one accepts, test lower setup + higher monthly." },
  // Phase 3 — First pilot (weeks 9–12)
  { title: "Book pilot kick-offs before 15 Dec", description: "Phase 3. Avoid the holiday stall." },
  { title: "Build the first pilot workflow", description: "Phase 3. Nick builds, Olga runs it with the customer." },
  { title: "Measure before/after and write the case study", description: "Week-12 gate, 4 Jan. Use the customer's real numbers only." },
  // Open decisions
  { title: "Decide: switch website hero to Jobb-til-faktura?", description: "Open question from the GTM plan." },
  { title: "Decide which accounting systems to support first", description: "Open question. Decide from what discovery calls show (Tripletex, Fiken, PowerOffice, Visma)." },
];
