// The 30-day execution plan (19 Oct – 17 Nov 2026) and the daily planner's
// rules. Pure — no imports — so it can be unit-tested (execution-plan.test.ts).
// Dates are YYYY-MM-DD in Oslo; times are HH:MM in Oslo.

export const PLAN_START = "2026-10-19";
export const PLAN_END = "2026-11-17";
// Week-4 gate (from the GTM plan); the plan's last two days adapt to it.
export const GATE_DATE = "2026-11-09";

export function isWorkingDay(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Every working day (Mon–Fri) from `from` to `to`, inclusive. */
export function workingDays(from: string, to: string) {
  const days: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) if (isWorkingDay(date)) days.push(date);
  return days;
}

export const PLAN_DAYS = workingDays(PLAN_START, PLAN_END);

/** 1-based working-day number within the plan, or null outside it / at weekends. */
export function planDayNumber(date: string) {
  const index = PLAN_DAYS.indexOf(date);
  return index === -1 ? null : index + 1;
}

/** The next working day on or after `date`. */
export function nextWorkingDay(date: string) {
  let day = date;
  while (!isWorkingDay(day)) day = addDays(day, 1);
  return day;
}

// ---------------------------------------------------------------------------
// Daily schedule

export type BlockKey =
  "plan" | "research" | "break1" | "outreach" | "lunch" | "linkedin" | "break2" | "followups" | "gtm" | "review";

export type BlockConfig = { key: BlockKey; label: string; minutes: number; isBreak?: boolean };

export const DEFAULT_DAY_START = "08:30";
export const DEFAULT_BLOCKS: BlockConfig[] = [
  { key: "plan", label: "Review pipeline and plan the day", minutes: 30 },
  { key: "research", label: "Prospect research", minutes: 90 },
  { key: "break1", label: "Break", minutes: 15, isBreak: true },
  { key: "outreach", label: "New prospect outreach", minutes: 90 },
  { key: "lunch", label: "Lunch", minutes: 45, isBreak: true },
  { key: "linkedin", label: "LinkedIn marketing and visibility", minutes: 60 },
  { key: "break2", label: "Break", minutes: 15, isBreak: true },
  { key: "followups", label: "Follow-ups and sales conversations", minutes: 60 },
  { key: "gtm", label: "GTM improvement project", minutes: 60 },
  { key: "review", label: "Daily review", minutes: 15 },
];

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export type ScheduledBlock = BlockConfig & { start: string; end: string };

/** Lays the blocks out back to back from the day's start time. */
export function scheduleBlocks(dayStart: string, blocks: BlockConfig[]): ScheduledBlock[] {
  let cursor = toMinutes(dayStart);
  return blocks.map((block) => {
    const start = cursor;
    cursor += block.minutes;
    return { ...block, start: toTime(start), end: toTime(cursor) };
  });
}

/** The block running at `time` (HH:MM), or null before/after the working day. */
export function currentBlock(blocks: ScheduledBlock[], time: string) {
  return blocks.find((block) => block.start <= time && time < block.end) ?? null;
}

// ---------------------------------------------------------------------------
// Task definitions

export type TaskCategory =
  "planning" | "research" | "outreach" | "linkedin" | "follow_up" | "sales_call" | "gtm_project" | "review";
export type TaskPriority = "critical" | "high" | "normal" | "low";
export type Milestone = "discovery" | "pilot_offers" | "first_pilot";

export type PlannedTask = {
  sourceKey: string; // stable id — generation is idempotent on it
  date: string;
  title: string;
  description?: string;
  block: BlockKey;
  category: TaskCategory;
  priority: TaskPriority;
  minutes: number;
  milestone?: Milestone;
};

// Weekly targets → per-day counts for the recurring tasks.
export const DAILY_RESEARCH = 4;
export const DAILY_FIRST_CONTACTS = 4;

type RoadmapItem = Omit<PlannedTask, "sourceKey"> & { key: string };

const R = (date: string, key: string, rest: Omit<RoadmapItem, "date" | "key">): RoadmapItem => ({ date, key, ...rest });

// The four weekly phases of the 30-day plan. Recurring daily work (research,
// first contacts, follow-ups, review) is generated separately.
export const ROADMAP_WEEKS = [
  { start: "2026-10-19", end: "2026-10-23", theme: "Foundation and initial outreach" },
  { start: "2026-10-26", end: "2026-10-30", theme: "Prospecting and market discovery" },
  { start: "2026-11-02", end: "2026-11-06", theme: "Qualified opportunities" },
  { start: "2026-11-09", end: "2026-11-13", theme: "Validation and pilot preparation" },
  { start: "2026-11-16", end: "2026-11-17", theme: "Advance pilots and plan the next phase" },
] as const;

const ROADMAP: RoadmapItem[] = [
  // Week 1 — foundation and initial outreach
  R("2026-10-19", "audit-dashboard", {
    title: "Audit the GTM dashboard",
    description: "Walk through Marketing: priorities, pipeline, lead finder, composer. Note anything broken.",
    block: "gtm",
    category: "gtm_project",
    priority: "high",
    minutes: 60,
  }),
  R("2026-10-19", "fix-research-setup", {
    title: "Investigate failed research jobs",
    description:
      "Add Anthropic credits, run gtm_command_centre.sql and daily_execution.sql, then retry the failed jobs.",
    block: "plan",
    category: "gtm_project",
    priority: "critical",
    minutes: 30,
  }),
  R("2026-10-19", "review-prospects", {
    title: "Review the prospect list and prioritise high-fit leads",
    description: "Start with BP Entreprenør, Aune Maskin, Knapphus and Engens.",
    block: "research",
    category: "research",
    priority: "high",
    minutes: 45,
  }),
  R("2026-10-20", "verify-queue", {
    title: "Verify research queue reliability",
    description: "Research one company end to end: queued → processing → ready for review → approved.",
    block: "gtm",
    category: "gtm_project",
    priority: "high",
    minutes: 60,
  }),
  R("2026-10-21", "fix-inconsistencies", {
    title: "Check lead data and the message composer",
    description: "Opener facts show in the composer for every lead; follow-up dates are set after a logged contact.",
    block: "gtm",
    category: "gtm_project",
    priority: "normal",
    minutes: 60,
  }),
  R("2026-10-21", "linkedin-post-1", {
    title: "Publish LinkedIn post 1",
    description: "A practical observation about field jobs → invoices. No customer claims.",
    block: "linkedin",
    category: "linkedin",
    priority: "high",
    minutes: 60,
  }),
  R("2026-10-23", "linkedin-post-2", {
    title: "Publish LinkedIn post 2",
    block: "linkedin",
    category: "linkedin",
    priority: "high",
    minutes: 60,
  }),
  // Week 2 — prospecting and market discovery
  R("2026-10-26", "linkedin-post-3", {
    title: "Publish LinkedIn post 3",
    block: "linkedin",
    category: "linkedin",
    priority: "high",
    minutes: 60,
  }),
  R("2026-10-27", "record-workflows", {
    title: "Write up discovery calls: workflows and pain points",
    description: "Every call recorded on the lead page with hours/week and problem categories.",
    block: "gtm",
    category: "sales_call",
    priority: "high",
    minutes: 60,
    milestone: "discovery",
  }),
  R("2026-10-28", "linkedin-post-4", {
    title: "Publish LinkedIn post 4",
    block: "linkedin",
    category: "linkedin",
    priority: "high",
    minutes: 60,
  }),
  R("2026-10-29", "compare-segments", {
    title: "Compare industry segments",
    description: "Which segments reply, book calls and report the most admin hours?",
    block: "gtm",
    category: "gtm_project",
    priority: "normal",
    minutes: 60,
  }),
  R("2026-10-30", "linkedin-post-5", {
    title: "Publish LinkedIn post 5",
    block: "linkedin",
    category: "linkedin",
    priority: "high",
    minutes: 60,
  }),
  // Week 3 — qualified opportunities
  R("2026-11-02", "focus-segments", {
    title: "Focus outreach on the most promising segments",
    description: "Use the segment comparison to pick this week's research filters.",
    block: "plan",
    category: "planning",
    priority: "high",
    minutes: 30,
  }),
  R("2026-11-03", "quantify-effort", {
    title: "Quantify reported admin effort and accounting systems",
    description: "Check every completed call has hours/week and the accounting system.",
    block: "gtm",
    category: "sales_call",
    priority: "high",
    minutes: 60,
    milestone: "discovery",
  }),
  R("2026-11-04", "workflow-demo-1", {
    title: "Build a practical workflow demonstration (part 1)",
    description: "Finished job → draft invoice, using what calls revealed.",
    block: "gtm",
    category: "gtm_project",
    priority: "high",
    minutes: 60,
    milestone: "pilot_offers",
  }),
  R("2026-11-05", "workflow-demo-2", {
    title: "Build a practical workflow demonstration (part 2)",
    block: "gtm",
    category: "gtm_project",
    priority: "high",
    minutes: 60,
    milestone: "pilot_offers",
  }),
  R("2026-11-05", "pilot-candidates", {
    title: "Identify potential pilot candidates",
    description: "Completed call, 5+ h/week, pilot interest yes/maybe.",
    block: "followups",
    category: "sales_call",
    priority: "high",
    minutes: 30,
    milestone: "pilot_offers",
  }),
  R("2026-11-06", "proposal-structure", {
    title: "Draft the structure of a pilot proposal",
    block: "gtm",
    category: "gtm_project",
    priority: "high",
    minutes: 60,
    milestone: "pilot_offers",
  }),
  // Week 4 — validation and pilot preparation
  R("2026-11-09", "gate-review", {
    title: "Week-4 gate review",
    description:
      "Do 5+ of 15 interviewed companies share one problem at 5+ h/week? Decide: continue or switch the workflow.",
    block: "plan",
    category: "review",
    priority: "critical",
    minutes: 30,
    milestone: "discovery",
  }),
  R("2026-11-09", "analyse-evidence", {
    title: "Analyse discovery-call evidence",
    block: "gtm",
    category: "review",
    priority: "high",
    minutes: 60,
    milestone: "discovery",
  }),
  R("2026-11-10", "one-page-proposal", {
    title: "Draft the one-page pilot proposal",
    block: "gtm",
    category: "gtm_project",
    priority: "critical",
    minutes: 60,
    milestone: "pilot_offers",
  }),
  R("2026-11-11", "process-mapping", {
    title: "Process-mapping discussions with pilot candidates",
    block: "followups",
    category: "sales_call",
    priority: "high",
    minutes: 60,
    milestone: "pilot_offers",
  }),
  R("2026-11-12", "integration-requirements", {
    title: "Investigate accounting integration requirements",
    description: "For the systems calls reported (Tripletex, Fiken, PowerOffice, Visma).",
    block: "gtm",
    category: "gtm_project",
    priority: "high",
    minutes: 60,
    milestone: "pilot_offers",
  }),
  R("2026-11-13", "outreach-performance", {
    title: "Review outreach performance",
    description: "Reply rates by segment, channel and message type.",
    block: "gtm",
    category: "review",
    priority: "normal",
    minutes: 30,
  }),
  R("2026-11-13", "next-phase", {
    title: "Prepare the next phase of the GTM strategy",
    block: "gtm",
    category: "planning",
    priority: "high",
    minutes: 30,
  }),
];

/**
 * The plan's last two days (16–17 Nov) depend on the week-4 gate, so they're
 * generated only from the gate date on, using what the evidence shows.
 */
export function finalDaysRoadmap(gateMet: boolean, qualifiedLeads: number): RoadmapItem[] {
  return [
    R("2026-11-16", "follow-up-qualified", {
      title:
        qualifiedLeads > 0
          ? `Follow up with the ${qualifiedLeads} qualified prospect${qualifiedLeads === 1 ? "" : "s"}`
          : "Follow up with the most interested prospects",
      block: "followups",
      category: "follow_up",
      priority: "critical",
      minutes: 60,
      milestone: "pilot_offers",
    }),
    R("2026-11-16", gateMet ? "advance-pilots" : "rethink-workflow", {
      title: gateMet
        ? "Advance pilot opportunities: send proposals"
        : "Gate not met: choose the next workflow hypothesis",
      description: gateMet
        ? "Send the one-page proposal to each qualified candidate and agree next steps."
        : "Use the evidence to pick the problem to test next; adjust messages and segments.",
      block: "gtm",
      category: gateMet ? "sales_call" : "planning",
      priority: "critical",
      minutes: 60,
      milestone: "pilot_offers",
    }),
    R("2026-11-16", "record-evidence", {
      title: "Record outstanding discovery-call evidence",
      block: "plan",
      category: "sales_call",
      priority: "high",
      minutes: 30,
      milestone: "discovery",
    }),
    R("2026-11-17", "improve-outreach", {
      title: "Improve the outreach process",
      description: "Keep what got replies; drop what didn't.",
      block: "gtm",
      category: "gtm_project",
      priority: "normal",
      minutes: 30,
    }),
    R("2026-11-17", "plan-next-two-weeks", {
      title: "Prepare the next two weeks of execution",
      description: "Targets, segments and pilot steps up to the 7 Dec milestone.",
      block: "gtm",
      category: "planning",
      priority: "critical",
      minutes: 30,
    }),
  ];
}

export function roadmapTasks(options: {
  includeFinalDays: boolean;
  gateMet: boolean;
  qualifiedLeads: number;
}): PlannedTask[] {
  const items = options.includeFinalDays
    ? [...ROADMAP, ...finalDaysRoadmap(options.gateMet, options.qualifiedLeads)]
    : ROADMAP;
  return items.map(({ key, ...task }) => ({ ...task, sourceKey: `roadmap:${task.date}:${key}` }));
}

/** Recurring daily work for one working day, sized from the weekly targets. */
export function recurringTasks(date: string): PlannedTask[] {
  if (!isWorkingDay(date)) return [];
  const friday = new Date(`${date}T00:00:00Z`).getUTCDay() === 5;
  const t = (key: string, task: Omit<PlannedTask, "sourceKey" | "date">): PlannedTask => ({
    ...task,
    date,
    sourceKey: `recurring:${date}:${key}`,
  });
  return [
    t("plan", {
      title: "Review the pipeline and plan the day",
      description: "Check Today's priorities, confirm the morning check-in.",
      block: "plan",
      category: "planning",
      priority: "high",
      minutes: 30,
    }),
    t("research", {
      title: `Research ${DAILY_RESEARCH} companies`,
      description: "Verify company info, find the decision-maker, record an opener fact, approve or reject each one.",
      block: "research",
      category: "research",
      priority: "high",
      minutes: 90,
    }),
    t("outreach", {
      title: `Send ${DAILY_FIRST_CONTACTS} personalised first contacts`,
      description: "Write the opener from the researched fact; log each message in the composer.",
      block: "outreach",
      category: "outreach",
      priority: "critical",
      minutes: 90,
    }),
    t("linkedin", {
      title: "LinkedIn visibility",
      description: "Comment on prospects' and industry posts; accept and reply to connections.",
      block: "linkedin",
      category: "linkedin",
      priority: "normal",
      minutes: 30,
    }),
    t("followups", {
      title: "Follow-ups and sales conversations",
      description: "Work through today's follow-ups and replies.",
      block: "followups",
      category: "follow_up",
      priority: "high",
      minutes: 30,
    }),
    t("review", {
      title: "Daily review",
      description: "Submit the end-of-day review.",
      block: "review",
      category: "review",
      priority: "high",
      minutes: 15,
    }),
    ...(friday
      ? [
          t("weekly-review", {
            title: "Weekly review",
            description: "Look at the week's numbers and record what to change.",
            block: "review",
            category: "review",
            priority: "critical",
            minutes: 30,
          }),
        ]
      : []),
  ];
}

// ---------------------------------------------------------------------------
// Execution score

export type ScoredTask = {
  status: string;
  priority: TaskPriority;
  plannedDate: string;
  blockEnd: string | null; // HH:MM the task's block ends, if known
};

const IMPORTANT: TaskPriority[] = ["critical", "high"];

/**
 * Execution rate = completed planned tasks / planned tasks due × 100.
 * A task is due once its day has passed, or today once its block has ended;
 * completed tasks always count. Cancelled and deferred-away tasks are left out.
 */
export function scoreDay(tasks: ScoredTask[], day: string, today: string, now: string) {
  const relevant = tasks.filter(
    (task) => task.plannedDate === day && task.status !== "cancelled" && task.status !== "deferred"
  );
  const isDue = (task: ScoredTask) =>
    task.status === "completed" || day < today || (day === today && task.blockEnd !== null && task.blockEnd <= now);
  const due = relevant.filter(isDue);
  const completed = due.filter((task) => task.status === "completed");
  const importantDue = due.filter((task) => IMPORTANT.includes(task.priority));
  const importantDone = importantDue.filter((task) => task.status === "completed");
  const criticalMissed = due.filter((task) => task.priority === "critical" && task.status !== "completed").length;

  const rate = due.length === 0 ? null : Math.round((completed.length / due.length) * 100);
  const importantRate =
    importantDue.length === 0 ? null : Math.round((importantDone.length / importantDue.length) * 100);

  // Status: plain counts, and essential sales work can't be hidden by many
  // small tasks — any missed critical task means at least "Needs attention".
  let status: "on_track" | "needs_attention" | "behind" | "not_started" = "not_started";
  if (rate !== null) {
    if (rate >= 80 && criticalMissed === 0) status = "on_track";
    else if (rate >= 50 || (importantRate ?? 0) >= 50) status = "needs_attention";
    else status = "behind";
  }

  return {
    planned: relevant.length,
    due: due.length,
    completed: completed.length,
    missed: due.filter((task) => task.status === "missed" || (task.status === "not_started" && day < today)).length,
    blocked: relevant.filter((task) => task.status === "blocked").length,
    importantDue: importantDue.length,
    importantDone: importantDone.length,
    criticalMissed,
    rate,
    importantRate,
    status,
  };
}

// ---------------------------------------------------------------------------
// Pipeline → tasks. Pure inputs (the caller resolves follow-up dates), so the
// rules can be tested without a database.

export type PipelineLead = {
  id: string;
  name: string;
  status: string;
  responded: boolean;
  followUpDue: string | null; // from the lead's stored follow-up date
  nextAction: string | null;
  hasCall: boolean; // a booked or completed discovery call exists
};
export type PipelineCall = { id: string; leadId: string; status: string; scheduledOn: string | null };
export type PlannedLeadTask = PlannedTask & { leadId?: string };

const CLOSED = ["converted", "not_interested"];

/** Tasks the CRM asks for today. Keys are stable per event, so re-running adds nothing. */
export function pipelineTasks(input: {
  today: string;
  leads: PipelineLead[];
  calls: PipelineCall[];
  failedResearch: number;
}): PlannedLeadTask[] {
  const { today } = input;
  const tasks: PlannedLeadTask[] = [];
  for (const lead of input.leads) {
    if (lead.status === "converted") {
      tasks.push({
        sourceKey: `crm:pilot-kickoff:${lead.id}`,
        date: today,
        title: `Plan the pilot kick-off: ${lead.name}`,
        description: "Agree scope, start date and the before-measurement.",
        block: "gtm",
        category: "sales_call",
        priority: "critical",
        minutes: 45,
        milestone: "first_pilot",
        leadId: lead.id,
      });
    }
    if (CLOSED.includes(lead.status)) continue;
    if (lead.followUpDue && lead.followUpDue <= today) {
      tasks.push({
        // One task per lead per due date: a snoozed follow-up gets a new one.
        sourceKey: `crm:follow-up:${lead.id}:${lead.followUpDue}`,
        date: today,
        title: `${lead.status === "proposal_sent" ? "Follow up on the proposal" : "Follow up"}: ${lead.name}`,
        description: lead.nextAction ?? "Send the one follow-up from the composer.",
        block: "followups",
        category: "follow_up",
        priority: lead.followUpDue < today ? "critical" : "high",
        minutes: 10,
        leadId: lead.id,
      });
    }
    if (lead.responded && ["new", "contacted", "interested"].includes(lead.status) && !lead.hasCall) {
      tasks.push({
        sourceKey: `crm:reply:${lead.id}`,
        date: today,
        title: `Record the reply and book a discovery call: ${lead.name}`,
        block: "followups",
        category: "sales_call",
        priority: "critical",
        minutes: 15,
        milestone: "discovery",
        leadId: lead.id,
      });
    }
  }
  const names = new Map(input.leads.map((lead) => [lead.id, lead.name]));
  for (const call of input.calls) {
    const name = names.get(call.leadId);
    if (call.status !== "booked" || !name) continue;
    tasks.push({
      sourceKey: `crm:call-prep:${call.id}`,
      date: call.scheduledOn && call.scheduledOn > today ? call.scheduledOn : today,
      title: `Prepare for the discovery call: ${name}`,
      description: "Read their notes and opener; have the interview guide open.",
      block: "followups",
      category: "sales_call",
      priority: "high",
      minutes: 15,
      milestone: "discovery",
      leadId: call.leadId,
    });
  }
  if (input.failedResearch > 0) {
    tasks.push({
      sourceKey: `crm:research-failed:${today}`,
      date: today,
      title: `Look at ${input.failedResearch} failed research job${input.failedResearch === 1 ? "" : "s"}`,
      description: "Marketing → Lead finder → Failed: fix the account problem, retry, or add without research.",
      block: "plan",
      category: "research",
      priority: "normal",
      minutes: 10,
    });
  }
  return tasks;
}

export type OpenGeneratedTask = { id: string; sourceKey: string; leadId: string | null; createdAt: string };

/**
 * Which open generated tasks are now done — or no longer needed — judged only
 * from recorded activity. A status change alone never completes a task.
 */
export function settleTasks(input: {
  today: string;
  tasks: OpenGeneratedTask[];
  firstContactsToday: number;
  researchedToday: number;
  followUpMessages: { leadId: string; createdAt: string }[];
  leads: PipelineLead[];
  calls: PipelineCall[];
}): { id: string; status: "completed" | "cancelled"; reason: string }[] {
  const { today } = input;
  const leads = new Map(input.leads.map((lead) => [lead.id, lead]));
  const calls = new Map(input.calls.map((call) => [call.id, call]));
  const result: { id: string; status: "completed" | "cancelled"; reason: string }[] = [];

  for (const task of input.tasks) {
    const key = task.sourceKey;
    if (key === `recurring:${today}:outreach`) {
      if (input.firstContactsToday >= DAILY_FIRST_CONTACTS)
        result.push({ id: task.id, status: "completed", reason: `${input.firstContactsToday} first contacts logged` });
    } else if (key === `recurring:${today}:research`) {
      if (input.researchedToday >= DAILY_RESEARCH)
        result.push({ id: task.id, status: "completed", reason: "Daily research target reached" });
    } else if (key.startsWith("crm:follow-up:") && task.leadId) {
      const followedUp = input.followUpMessages.some((m) => m.leadId === task.leadId && m.createdAt >= task.createdAt);
      const lead = leads.get(task.leadId);
      const stillDue = Boolean(
        lead && !CLOSED.includes(lead.status) && !lead.responded && lead.followUpDue && lead.followUpDue <= today
      );
      if (followedUp) result.push({ id: task.id, status: "completed", reason: "Follow-up logged" });
      else if (!stillDue)
        result.push({ id: task.id, status: "cancelled", reason: "No longer needed (replied, closed or rescheduled)" });
    } else if (key.startsWith("crm:reply:") && task.leadId) {
      if (leads.get(task.leadId)?.hasCall)
        result.push({ id: task.id, status: "completed", reason: "Discovery call booked" });
    } else if (key.startsWith("crm:call-prep:")) {
      const call = calls.get(key.slice("crm:call-prep:".length));
      if (call?.status === "completed") result.push({ id: task.id, status: "completed", reason: "Call completed" });
      else if (!call || call.status === "cancelled")
        result.push({ id: task.id, status: "cancelled", reason: "Call cancelled" });
    }
  }
  return result;
}

/**
 * Gives each task in a block a clock slot, back to back by estimated minutes
 * (tasks without an estimate get 15). Tasks that run past the block's end are
 * flagged so the planner can show the block is overbooked.
 */
export function slotTasks<T extends { estimated_minutes: number | null }>(
  block: { start: string; end: string },
  tasks: T[]
) {
  let cursor = toMinutes(block.start);
  const end = toMinutes(block.end);
  return tasks.map((task) => {
    const start = cursor;
    cursor += task.estimated_minutes ?? 15;
    return { task, start: toTime(start), end: toTime(cursor), overflows: cursor > end };
  });
}

/** Minutes from `from` to `to` (HH:MM), for laying out the hourly day view. */
export function minutesBetween(from: string, to: string) {
  return toMinutes(to) - toMinutes(from);
}

// ---------------------------------------------------------------------------
// Time tracking: a task's time is the sum of its running stretches. A stretch
// starts on Start and ends on Pause/Complete/Block/Defer/Cancel (or when
// another task is started). One forgotten timer can't add more than 10 hours.

export const MAX_SEGMENT_SECONDS = 10 * 60 * 60;

/** Seconds in the current running stretch (0 if not running). */
export function segmentSeconds(timerStartedAt: string | null, now: Date) {
  if (!timerStartedAt) return 0;
  const seconds = Math.floor((now.getTime() - Date.parse(timerStartedAt)) / 1000);
  return Math.min(MAX_SEGMENT_SECONDS, Math.max(0, seconds));
}

/** Total tracked time including any running stretch. */
export function trackedSeconds(task: { tracked_seconds?: number | null; timer_started_at?: string | null }, now: Date) {
  return (task.tracked_seconds ?? 0) + segmentSeconds(task.timer_started_at ?? null, now);
}

/** 754 → "12:34", 4000 → "1:06:40" — for the live timer. */
export function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return h > 0 ? `${h}:${mm}:${String(s).padStart(2, "0")}` : `${mm}:${String(s).padStart(2, "0")}`;
}

/** 4000 → "1 h 7 min", 90 → "2 min" — for totals. */
export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
}
