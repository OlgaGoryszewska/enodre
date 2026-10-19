import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BLOCKS,
  DEFAULT_DAY_START,
  PLAN_DAYS,
  currentBlock,
  nextWorkingDay,
  planDayNumber,
  recurringTasks,
  roadmapTasks,
  scheduleBlocks,
  scoreDay,
  pipelineTasks,
  settleTasks,
  type PipelineLead,
  slotTasks,
  minutesBetween,
  segmentSeconds,
  trackedSeconds,
  formatTimer,
  formatDuration,
  MAX_SEGMENT_SECONDS,
} from "./execution-plan.ts";

test("the plan covers working days 19 Oct – 17 Nov only", () => {
  assert.equal(PLAN_DAYS[0], "2026-10-19");
  assert.equal(PLAN_DAYS.at(-1), "2026-11-17");
  assert.equal(PLAN_DAYS.length, 22);
  assert.ok(!PLAN_DAYS.includes("2026-10-24")); // Saturday
  assert.equal(planDayNumber("2026-10-19"), 1);
  assert.equal(planDayNumber("2026-10-26"), 6);
  assert.equal(planDayNumber("2026-10-25"), null);
  assert.equal(nextWorkingDay("2026-10-24"), "2026-10-26");
});

test("default schedule runs 08:30–16:30", () => {
  const blocks = scheduleBlocks(DEFAULT_DAY_START, DEFAULT_BLOCKS);
  assert.equal(blocks[0].start, "08:30");
  assert.equal(blocks.find((b) => b.key === "research")?.start, "09:00");
  assert.equal(blocks.find((b) => b.key === "lunch")?.start, "12:15");
  assert.equal(blocks.find((b) => b.key === "gtm")?.start, "15:15");
  assert.equal(blocks.at(-1)?.end, "16:30");
  assert.equal(currentBlock(blocks, "10:40")?.key, "break1");
  assert.equal(currentBlock(blocks, "16:30"), null);
  assert.equal(currentBlock(blocks, "07:00"), null);
});

test("roadmap source keys are unique and on working days", () => {
  const tasks = roadmapTasks({ includeFinalDays: true, gateMet: true, qualifiedLeads: 2 });
  const keys = tasks.map((t) => t.sourceKey);
  assert.equal(new Set(keys).size, keys.length);
  for (const task of tasks) assert.ok(PLAN_DAYS.includes(task.date), task.sourceKey);
  assert.ok(
    !roadmapTasks({ includeFinalDays: false, gateMet: false, qualifiedLeads: 0 }).some((t) => t.date >= "2026-11-16")
  );
});

test("recurring tasks: none at weekends, weekly review on Fridays", () => {
  assert.equal(recurringTasks("2026-10-24").length, 0);
  assert.ok(recurringTasks("2026-10-23").some((t) => t.sourceKey.endsWith("weekly-review")));
  assert.ok(!recurringTasks("2026-10-22").some((t) => t.sourceKey.endsWith("weekly-review")));
  // Same day twice → same keys (idempotent generation).
  assert.deepEqual(
    recurringTasks("2026-10-22").map((t) => t.sourceKey),
    recurringTasks("2026-10-22").map((t) => t.sourceKey)
  );
});

test("scoreDay counts only due tasks and flags missed critical work", () => {
  const day = "2026-10-20";
  const task = (status: string, priority: "critical" | "high" | "normal" | "low", blockEnd = "10:00") => ({
    status,
    priority,
    plannedDate: day,
    blockEnd,
  });
  // During the day: only tasks whose block ended (or completed) count.
  const midday = scoreDay(
    [task("completed", "high"), task("not_started", "normal", "15:00"), task("cancelled", "high")],
    day,
    day,
    "12:00"
  );
  assert.equal(midday.due, 1);
  assert.equal(midday.rate, 100);

  // Past day: 9 of 12 → 75%, a missed critical task means "needs attention".
  const tasks = [
    ...Array.from({ length: 9 }, () => task("completed", "normal")),
    task("missed", "critical"),
    task("missed", "normal"),
    task("blocked", "high"),
  ];
  const past = scoreDay(tasks, day, "2026-10-21", "09:00");
  assert.equal(past.due, 12);
  assert.equal(past.completed, 9);
  assert.equal(past.rate, 75);
  assert.equal(past.blocked, 1);
  assert.equal(past.criticalMissed, 1);
  assert.equal(past.status, "needs_attention");

  // Many trivial tasks done can't hide skipped essential work.
  const hidden = scoreDay(
    [...Array.from({ length: 10 }, () => task("completed", "low")), task("missed", "critical")],
    day,
    "2026-10-21",
    "09:00"
  );
  assert.equal(hidden.rate, 91);
  assert.notEqual(hidden.status, "on_track");
});

const lead = (over: Partial<PipelineLead>): PipelineLead => ({
  id: "L1",
  name: "Aune Maskin AS",
  status: "contacted",
  responded: false,
  followUpDue: null,
  nextAction: null,
  hasCall: false,
  ...over,
});

test("pipelineTasks: follow-ups, replies, call prep and pilots come from records, linked to the lead", () => {
  const today = "2026-10-22";
  const tasks = pipelineTasks({
    today,
    leads: [
      lead({ id: "due", followUpDue: "2026-10-22" }),
      lead({ id: "overdue", followUpDue: "2026-10-20" }),
      lead({ id: "later", followUpDue: "2026-10-27" }),
      lead({ id: "replied", responded: true }),
      lead({ id: "proposal", status: "proposal_sent", followUpDue: "2026-10-22" }),
      lead({ id: "won", status: "converted", followUpDue: "2026-10-01" }),
    ],
    calls: [
      { id: "C1", leadId: "replied", status: "booked", scheduledOn: "2026-10-24" },
      { id: "C2", leadId: "due", status: "cancelled", scheduledOn: null },
    ],
    failedResearch: 0,
  });
  const byKey = new Map(tasks.map((t) => [t.sourceKey, t]));
  assert.equal(byKey.get("crm:follow-up:due:2026-10-22")?.priority, "high");
  assert.equal(byKey.get("crm:follow-up:overdue:2026-10-20")?.priority, "critical");
  assert.ok(![...byKey.keys()].some((k) => k.includes(":later:"))); // not due yet
  assert.equal(byKey.get("crm:reply:replied")?.leadId, "replied");
  assert.match(byKey.get("crm:follow-up:proposal:2026-10-22")?.title ?? "", /proposal/);
  assert.equal(byKey.get("crm:call-prep:C1")?.leadId, "replied");
  assert.equal(byKey.get("crm:call-prep:C1")?.date, "2026-10-24"); // prepared on the call day
  assert.ok(!byKey.has("crm:call-prep:C2")); // cancelled call → no prep
  assert.equal(byKey.get("crm:pilot-kickoff:won")?.milestone, "first_pilot");
  assert.ok(![...byKey.keys()].some((k) => k.startsWith("crm:follow-up:won"))); // won → no reminders
  // Same records → same keys: generation can't duplicate.
  const again = pipelineTasks({
    today,
    leads: [lead({ id: "due", followUpDue: "2026-10-22" })],
    calls: [],
    failedResearch: 0,
  });
  assert.equal(again[0].sourceKey, "crm:follow-up:due:2026-10-22");
});

test("settleTasks completes only on recorded activity", () => {
  const today = "2026-10-22";
  const created = "2026-10-22T07:00:00Z";
  const open = [
    { id: "out", sourceKey: `recurring:${today}:outreach`, leadId: null, createdAt: created },
    { id: "fu-done", sourceKey: "crm:follow-up:A:2026-10-22", leadId: "A", createdAt: created },
    { id: "fu-replied", sourceKey: "crm:follow-up:B:2026-10-22", leadId: "B", createdAt: created },
    { id: "fu-open", sourceKey: "crm:follow-up:C:2026-10-22", leadId: "C", createdAt: created },
    { id: "prep", sourceKey: "crm:call-prep:K1", leadId: "D", createdAt: created },
    { id: "reply", sourceKey: "crm:reply:E", leadId: "E", createdAt: created },
  ];
  const leads = [
    lead({ id: "A", followUpDue: "2026-10-22" }),
    lead({ id: "B", followUpDue: "2026-10-22", responded: true }),
    lead({ id: "C", followUpDue: "2026-10-22" }),
    // Status moved to "call_booked" but no call exists: the reply task stays open.
    lead({ id: "E", status: "call_booked", responded: true, hasCall: false }),
  ];
  const result = settleTasks({
    today,
    tasks: open,
    firstContactsToday: 3, // below the daily 4 → outreach stays open
    researchedToday: 0,
    followUpMessages: [
      { leadId: "A", createdAt: "2026-10-22T09:00:00Z" },
      { leadId: "C", createdAt: "2026-10-21T09:00:00Z" }, // before the task → doesn't count
    ],
    leads,
    calls: [{ id: "K1", leadId: "D", status: "completed", scheduledOn: today }],
  });
  const byId = new Map(result.map((r) => [r.id, r.status]));
  assert.equal(byId.get("out"), undefined);
  assert.equal(byId.get("fu-done"), "completed");
  assert.equal(byId.get("fu-replied"), "cancelled");
  assert.equal(byId.get("fu-open"), undefined);
  assert.equal(byId.get("prep"), "completed");
  assert.equal(byId.get("reply"), undefined);

  const four = settleTasks({
    today,
    tasks: open.slice(0, 1),
    firstContactsToday: 4,
    researchedToday: 0,
    followUpMessages: [],
    leads: [],
    calls: [],
  });
  assert.equal(four[0]?.status, "completed");
});

test("slotTasks gives tasks clock times inside their block", () => {
  const block = { start: "09:00", end: "10:30" };
  const slots = slotTasks(block, [{ estimated_minutes: 45 }, { estimated_minutes: null }, { estimated_minutes: 45 }]);
  assert.deepEqual(
    slots.map((s) => [s.start, s.end, s.overflows]),
    [
      ["09:00", "09:45", false],
      ["09:45", "10:00", false],
      ["10:00", "10:45", true],
    ]
  );
  assert.equal(minutesBetween("08:30", "16:30"), 480);
});

test("time tracking sums stretches and caps a forgotten timer", () => {
  const now = new Date("2026-10-20T10:00:00Z");
  assert.equal(segmentSeconds(null, now), 0);
  assert.equal(segmentSeconds("2026-10-20T09:47:26Z", now), 754);
  assert.equal(segmentSeconds("2026-10-19T08:00:00Z", now), MAX_SEGMENT_SECONDS); // left on overnight
  assert.equal(segmentSeconds("2026-10-20T10:05:00Z", now), 0); // clock skew never goes negative
  assert.equal(trackedSeconds({ tracked_seconds: 600, timer_started_at: "2026-10-20T09:55:00Z" }, now), 900);
  assert.equal(trackedSeconds({ tracked_seconds: 600, timer_started_at: null }, now), 600);
  assert.equal(formatTimer(754), "12:34");
  assert.equal(formatTimer(4000), "1:06:40");
  assert.equal(formatTimer(5), "0:05");
  assert.equal(formatDuration(90), "2 min");
  assert.equal(formatDuration(4000), "1 h 7 min");
  assert.equal(formatDuration(3600), "1 h");
});
