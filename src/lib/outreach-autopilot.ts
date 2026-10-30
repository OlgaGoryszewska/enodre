// Outreach autopilot: which email, if any, a lead is due for. The "Run
// outreach" button sends only what these rules allow — first messages (capped
// per day) and due follow-ups — to Norwegian leads with a general company
// address, and only when the quality check has no notes at all.
// Pure, no imports (unit-tested).

export const AUTOPILOT = {
  /** New companies emailed per day (Oslo date). */
  newPerDay: 50,
  /** Follow-ups per run — a safety stop, not a target. */
  followUpsPerRun: 20,
  /** How far back the hiring search looks. */
  findDays: 30 as const,
  /** Queue candidates turned into leads per run (each needs an email search). */
  candidatesPerRun: 15,
  /** New leads without an email whose website is searched per run. */
  emailSearchesPerRun: 40,
  /** Email searches run side by side. */
  emailSearchConcurrency: 5,
  /** Stop starting new work after this, to stay inside the 300 s request limit. */
  timeBudgetMs: 220_000,
  /** Pause between emails, to stay well inside Microsoft 365's sending limits. */
  delayBetweenEmailsMs: 1500,
} as const;

export type AutoKind = "first_message" | "follow_up" | "final_follow_up";

type LeadState = {
  status: string;
  responded: boolean;
  do_not_contact?: boolean;
  country?: string | null;
  email: string | null;
  first_contacted_on: string | null;
  next_follow_up_on?: string | null;
};

type SentState = { kind: string; channel: string };

export type AutoStep = { kind: AutoKind } | { skip: string };

const CLOSED = ["converted", "not_interested"];
const FIRST_CONTACT = ["connection_note", "first_message", "email", "phone_opener"];

/**
 * The email this lead is due for today, or why it's skipped.
 * `sent` = the lead's sent messages; `emailIsGeneric` = post@/kontakt@-style.
 */
export function nextAutoStep(lead: LeadState, sent: SentState[], emailIsGeneric: boolean, today: string): AutoStep {
  if (lead.do_not_contact) return { skip: "Asked not to be contacted" };
  if (lead.responded) return { skip: "They replied — answer by hand" };
  if (CLOSED.includes(lead.status)) return { skip: "Closed" };
  if (lead.country === "PL") return { skip: "Poland: consent first (LinkedIn)" };
  if (!lead.email) return { skip: "No email" };
  if (!emailIsGeneric) return { skip: "Personal address — needs a company address (§15)" };

  const first = sent.find((message) => FIRST_CONTACT.includes(message.kind));
  if (!first) {
    if (lead.status !== "new" || lead.first_contacted_on) return { skip: "Contacted outside the app" };
    return { kind: "first_message" };
  }
  // Follow up by email only when the first contact was an email.
  if (first.channel !== "email") return { skip: "First contact wasn't by email" };
  const due = lead.next_follow_up_on ?? null;
  if (!due) return { skip: "No follow-up planned" };
  if (due > today) return { skip: `Follow-up due ${due}` };
  if (!sent.some((message) => message.kind === "follow_up")) return { kind: "follow_up" };
  if (!sent.some((message) => message.kind === "final_follow_up")) return { kind: "final_follow_up" };
  return { skip: "Sequence finished" };
}

/** May this message go out unseen? Only with no quality notes at all. */
export function passesAutopilotBar(issues: { level: string }[]) {
  return issues.length === 0;
}
