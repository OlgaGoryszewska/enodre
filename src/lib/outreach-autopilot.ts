// Outreach autopilot: which email, if any, a lead is due for. The "Run
// outreach" button sends only what these rules allow — first messages (capped
// per day) and due follow-ups — to Norwegian leads with a general company
// address, and only when the quality check has no notes at all.
// Pure, no imports (unit-tested).

export const AUTOPILOT = {
  /** New companies emailed per day (Oslo date). */
  newPerDay: 50,
  /** Follow-ups per run — a safety stop; about what fits in the time budget. */
  followUpsPerRun: 60,
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
  if (!first && lead.status === "new" && !lead.first_contacted_on) return { kind: "first_message" };
  // Contacted any way (email, LinkedIn, phone, or marked by hand): the
  // follow-up goes to the company address.
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

export type FollowUpStage = { label: string; tone: "due" | "waiting" | "done"; due: boolean; sent: boolean };

/**
 * Where a contacted lead is in the follow-up sequence, for the pipeline's
 * status column. Null before first contact and once the sequence has stopped
 * (they replied, declined, or it's closed). `dueOn` = the lead's follow-up date.
 */
export function followUpStage(
  lead: Pick<LeadState, "status" | "responded" | "do_not_contact" | "first_contacted_on">,
  sentKinds: string[],
  dueOn: string | null,
  today: string,
  formatDay: (date: string) => string = (date) => date
): FollowUpStage | null {
  if (lead.responded || lead.do_not_contact || CLOSED.includes(lead.status)) return null;
  const contacted = Boolean(lead.first_contacted_on) || sentKinds.some((kind) => FIRST_CONTACT.includes(kind));
  if (!contacted) return null;
  const followUpSent = sentKinds.includes("follow_up");
  if (sentKinds.includes("final_follow_up")) {
    return { label: "Final follow-up sent", tone: "done", due: false, sent: true };
  }
  const next = followUpSent ? "Final follow-up" : "Follow-up";
  if (!dueOn) {
    return {
      label: followUpSent ? "Follow-up sent" : "No follow-up planned",
      tone: "done",
      due: false,
      sent: followUpSent,
    };
  }
  if (dueOn <= today) {
    return {
      label: dueOn === today ? `${next} due today` : `${next} overdue · ${formatDay(dueOn)}`,
      tone: "due",
      due: true,
      sent: followUpSent,
    };
  }
  return {
    label: `${followUpSent ? "Follow-up sent · final" : "Follow-up"} due ${formatDay(dueOn)}`,
    tone: "waiting",
    due: false,
    sent: followUpSent,
  };
}
