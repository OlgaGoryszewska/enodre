// Pure GTM rules shared by the server actions and the dashboard — no imports,
// so they can be unit-tested directly (src/lib/gtm-logic.test.ts).
// Dates are plain YYYY-MM-DD strings, interpreted as calendar days in Oslo.

/** Today's date in Oslo as YYYY-MM-DD — the plan runs on Norwegian days. */
export function osloToday(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });
}

/** Adds business days (Mon–Fri) to a YYYY-MM-DD date. Norwegian public holidays are not skipped. */
export function addBusinessDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const weekday = d.getUTCDay();
    if (weekday !== 0 && weekday !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

/** Monday (YYYY-MM-DD) of the week `date` falls in. */
export function startOfWeek(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

// Outreach cadence from the GTM plan: one follow-up 4–5 days after first
// contact. Four business days lands on day 4–6 and never on a weekend.
export const FOLLOW_UP_BUSINESS_DAYS = 4;
// A proposal gets a nudge a week later if it's still open.
export const PROPOSAL_FOLLOW_UP_BUSINESS_DAYS = 5;

/**
 * Reads the older notes format some leads were created with
 * ("Segment F · Org.nr 962 956 491 · Vindafjord · 70 employees · Fit 5/5",
 * "Opener fact: …", "Source: …"), so their data isn't lost when the
 * dedicated fields are empty. Returns only what it finds.
 */
export function parseLegacyNotes(notes: string | null | undefined) {
  const result: {
    openerFact?: string;
    openerSource?: string;
    segment?: "F" | "A" | "B" | "C";
    orgNumber?: string;
    employees?: number;
    location?: string;
  } = {};
  if (!notes) return result;

  const opener = notes.match(/^Opener fact:\s*(.+)$/m);
  if (opener) result.openerFact = opener[1].trim();
  const source = notes.match(/^Source:\s*(https?:\/\/\S+)/m);
  if (source) result.openerSource = source[1].trim();

  const header = notes.match(/^Segment ([FABC])\s*·\s*Org\.nr ([\d ]+?)\s*·\s*(.+?)\s*·\s*(\d+) employees/m);
  if (header) {
    result.segment = header[1] as "F" | "A" | "B" | "C";
    result.orgNumber = header[2].replace(/\s/g, "");
    result.location = header[3].trim();
    result.employees = Number(header[4]);
  }
  return result;
}

export type ResearchErrorKind = "blocked" | "retryable" | "permanent";

/**
 * Sorts a research failure. "blocked" = the whole account can't research
 * (no credits, bad key, no permission, budget reached) — retrying any company
 * fails the same way, so batches must stop. "permanent" = this company's run
 * can't succeed as-is. Everything else is worth a limited retry.
 */
export function classifyResearchError(message: string): ResearchErrorKind {
  const text = message.toLowerCase();
  if (
    text.includes("credit balance") ||
    text.includes("invalid x-api-key") ||
    text.includes("authentication") ||
    text.includes("permission") ||
    text.includes("budget")
  ) {
    return "blocked";
  }
  if (text.includes("declined") || text.includes("refus")) return "permanent";
  return "retryable";
}

// Limited retries: after this many attempts a company needs a person to look.
export const MAX_RESEARCH_ATTEMPTS = 3;
// A run that has been "processing" this long was interrupted (the serverless
// function timed out or the tab closed mid-run) and may be claimed again.
export const STALE_PROCESSING_MINUTES = 10;

export function isStaleProcessing(startedAt: string | null, now = new Date()) {
  if (!startedAt) return true;
  return now.getTime() - Date.parse(startedAt) > STALE_PROCESSING_MINUTES * 60_000;
}

// ---------------------------------------------------------------------------
// Week-4 gate: do 5+ of 15 interviewed companies share one problem at 5+ h/week?

export const GATE_INTERVIEW_TARGET = 15;
export const GATE_COMPANIES_NEEDED = 5;
export const GATE_HOURS_THRESHOLD = 5;

export type GateCall = {
  leadId: string;
  status: string;
  hoursPerWeek: number | null;
  problemCategories: string[];
  pilotInterest: string | null;
};

export function computeGate(calls: GateCall[]) {
  // Only completed interviews count, one per company (its latest is passed in).
  const completed = calls.filter((call) => call.status === "completed");
  const companies = new Set(completed.map((call) => call.leadId));
  const meetsHours = completed.filter((call) => (call.hoursPerWeek ?? 0) >= GATE_HOURS_THRESHOLD);

  const byProblem = new Map<string, { reported: Set<string>; meetsHours: Set<string> }>();
  for (const call of completed) {
    for (const problem of call.problemCategories) {
      const entry = byProblem.get(problem) ?? { reported: new Set<string>(), meetsHours: new Set<string>() };
      entry.reported.add(call.leadId);
      if ((call.hoursPerWeek ?? 0) >= GATE_HOURS_THRESHOLD) entry.meetsHours.add(call.leadId);
      byProblem.set(problem, entry);
    }
  }
  const problems = [...byProblem.entries()]
    .map(([problem, entry]) => ({ problem, reported: entry.reported.size, meetsHours: entry.meetsHours.size }))
    .sort((a, b) => b.meetsHours - a.meetsHours || b.reported - a.reported);

  const top = problems[0];
  const interviewed = companies.size;
  const met = Boolean(top && top.meetsHours >= GATE_COMPANIES_NEEDED);
  const verdict: "met" | "not_enough_interviews" | "not_met" = met
    ? "met"
    : interviewed < GATE_INTERVIEW_TARGET
      ? "not_enough_interviews"
      : "not_met";

  return {
    interviewed,
    meetsHoursCount: new Set(meetsHours.map((call) => call.leadId)).size,
    pilotInterested: new Set(
      completed.filter((call) => call.pilotInterest === "yes" || call.pilotInterest === "maybe").map((c) => c.leadId)
    ).size,
    problems,
    verdict,
    topProblem: top ?? null,
  };
}
