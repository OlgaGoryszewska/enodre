"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logEvents } from "@/lib/execution-generate";
import { DEFAULT_BLOCKS, segmentSeconds } from "@/lib/execution-plan";
import {
  MILESTONE_VALUES,
  TASK_CATEGORY_VALUES,
  TASK_PRIORITY_VALUES,
  type GtmTask,
  type GtmTaskEvent,
} from "@/lib/execution-tasks";

const id = z.uuid();
const day = z.iso.date();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

function refresh() {
  revalidatePath("/admin/execution");
}

async function loadTask(supabase: Awaited<ReturnType<typeof createClient>>, taskId: string) {
  const { data, error } = await supabase.from("gtm_tasks").select("*").eq("id", taskId).single();
  if (error) throw error;
  return data as GtmTask;
}

/** Ends a running stretch: its seconds join the total and the timer stops. */
function stopTimer(task: GtmTask, now: Date) {
  if (!task.timer_started_at) return {};
  return {
    tracked_seconds: (task.tracked_seconds ?? 0) + segmentSeconds(task.timer_started_at, now),
    timer_started_at: null,
  };
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("reopen") }),
  z.object({ action: z.literal("block"), reason: z.string().trim().min(1, "Say what's blocking it.").max(500) }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(1, "Say why it's cancelled.").max(500) }),
  // Deferring needs a new date, or a clear reason for leaving it unscheduled.
  z
    .object({ action: z.literal("defer"), date: day.nullable(), reason: z.string().trim().max(500).nullable() })
    .refine((value) => value.date || value.reason, { message: "Pick a new date, or say why it stays unscheduled." }),
]);

export type TaskAction = z.input<typeof actionSchema>;

/** Start, pause, complete, reopen, block, cancel or defer a task — all recorded in its history. */
export async function updateTaskStatus(taskId: string, input: TaskAction) {
  const values = actionSchema.parse(input);
  const supabase = await createClient();
  const task = await loadTask(supabase, id.parse(taskId));
  const now = new Date();
  let patch: Record<string, unknown> = {};
  let event: { kind: string; from_value?: string | null; to_value?: string | null; note?: string | null };

  switch (values.action) {
    case "start": {
      // One timer at a time: pause whatever else is running first, so its
      // time is banked and nothing is counted twice.
      const { data: running } = await supabase
        .from("gtm_tasks")
        .select("*")
        .not("timer_started_at", "is", null)
        .neq("id", task.id);
      for (const other of (running ?? []) as GtmTask[]) {
        await supabase
          .from("gtm_tasks")
          .update({ ...stopTimer(other, now), status: "not_started", updated_at: now.toISOString() })
          .eq("id", other.id);
        await logEvents(supabase, [
          {
            task_id: other.id,
            kind: "status",
            from_value: other.status,
            to_value: "not_started",
            note: `Paused — started "${task.title}"`,
          },
        ]);
      }
      patch = {
        status: "in_progress",
        started_at: task.started_at ?? now.toISOString(),
        timer_started_at: task.timer_started_at ?? now.toISOString(),
      };
      event = { kind: "status", from_value: task.status, to_value: "in_progress" };
      break;
    }
    case "pause":
      patch = { ...stopTimer(task, now), status: "not_started" };
      event = { kind: "status", from_value: task.status, to_value: "not_started", note: "Paused" };
      break;
    case "complete": {
      const stopped = stopTimer(task, now);
      const total = "tracked_seconds" in stopped ? (stopped.tracked_seconds as number) : (task.tracked_seconds ?? 0);
      // Actual time = the tracked running time; untouched if nothing was tracked.
      const actual = total > 0 ? Math.min(1440, Math.max(1, Math.round(total / 60))) : task.actual_minutes;
      patch = {
        ...stopped,
        status: "completed",
        completed_at: now.toISOString(),
        actual_minutes: actual,
        status_reason: null,
      };
      event = {
        kind: "status",
        from_value: task.status,
        to_value: "completed",
        note: total > 0 ? `${Math.round(total / 60)} min tracked` : null,
      };
      break;
    }
    case "reopen":
      patch = { status: "not_started", completed_at: null, status_reason: null };
      event = { kind: "status", from_value: task.status, to_value: "not_started", note: "Reopened" };
      break;
    case "block":
      patch = { ...stopTimer(task, now), status: "blocked", status_reason: values.reason };
      event = { kind: "status", from_value: task.status, to_value: "blocked", note: values.reason };
      break;
    case "cancel":
      patch = { ...stopTimer(task, now), status: "cancelled", status_reason: values.reason };
      event = { kind: "status", from_value: task.status, to_value: "cancelled", note: values.reason };
      break;
    case "defer":
      patch = values.date
        ? { ...stopTimer(task, now), status: "not_started", planned_date: values.date, status_reason: values.reason }
        : { ...stopTimer(task, now), status: "deferred", status_reason: values.reason };
      event = values.date
        ? { kind: "rescheduled", from_value: task.planned_date, to_value: values.date, note: values.reason }
        : { kind: "status", from_value: task.status, to_value: "deferred", note: values.reason };
      break;
  }

  const { error } = await supabase
    .from("gtm_tasks")
    .update({ ...patch, updated_at: now.toISOString() })
    .eq("id", task.id);
  if (error) throw error;
  await logEvents(supabase, [{ task_id: task.id, ...event }]);
  refresh();
}

/** Moves a task to another day (calendar / rescheduling queue), keeping its history. */
export async function rescheduleTask(taskId: string, date: string) {
  const supabase = await createClient();
  const task = await loadTask(supabase, id.parse(taskId));
  const newDate = day.parse(date);
  const { error } = await supabase
    .from("gtm_tasks")
    .update({
      planned_date: newDate,
      // A missed task that's rescheduled is open again.
      status: task.status === "missed" || task.status === "deferred" ? "not_started" : task.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id);
  if (error) throw error;
  await logEvents(supabase, [
    { task_id: task.id, kind: "rescheduled", from_value: task.planned_date, to_value: newDate },
  ]);
  refresh();
}

export async function setTaskDeadline(taskId: string, date: string | null) {
  const supabase = await createClient();
  const task = await loadTask(supabase, id.parse(taskId));
  const deadline = day.nullable().parse(date);
  const { error } = await supabase
    .from("gtm_tasks")
    .update({ deadline, updated_at: new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
  await logEvents(supabase, [{ task_id: task.id, kind: "deadline", from_value: task.deadline, to_value: deadline }]);
  refresh();
}

export async function setTaskPriority(taskId: string, priority: string) {
  const supabase = await createClient();
  const task = await loadTask(supabase, id.parse(taskId));
  const value = z.enum(TASK_PRIORITY_VALUES).parse(priority);
  const { error } = await supabase
    .from("gtm_tasks")
    .update({ priority: value, updated_at: new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
  await logEvents(supabase, [{ task_id: task.id, kind: "priority", from_value: task.priority, to_value: value }]);
  refresh();
}

export async function addTaskNote(taskId: string, note: string) {
  const supabase = await createClient();
  const task = await loadTask(supabase, id.parse(taskId));
  const value = z.string().trim().min(1).max(2000).parse(note);
  const stamp = new Date().toLocaleString("en-GB", { timeZone: "Europe/Oslo", dateStyle: "short", timeStyle: "short" });
  const notes = [task.notes, `${stamp}: ${value}`].filter(Boolean).join("\n");
  const { error } = await supabase
    .from("gtm_tasks")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
  await logEvents(supabase, [{ task_id: task.id, kind: "note", note: value }]);
  refresh();
}

export async function linkTaskToLead(taskId: string, leadId: string | null) {
  const supabase = await createClient();
  const task = await loadTask(supabase, id.parse(taskId));
  const lead = id.nullable().parse(leadId);
  const { error } = await supabase
    .from("gtm_tasks")
    .update({ lead_id: lead, updated_at: new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
  await logEvents(supabase, [{ task_id: task.id, kind: "linked", from_value: task.lead_id, to_value: lead }]);
  refresh();
}

export async function getTaskHistory(taskId: string): Promise<GtmTaskEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gtm_task_events")
    .select("*")
    .eq("task_id", id.parse(taskId))
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GtmTaskEvent[];
}

const newTaskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title.").max(300),
  description: text(2000),
  category: z.enum(TASK_CATEGORY_VALUES),
  priority: z.enum(TASK_PRIORITY_VALUES),
  planned_date: day.nullable(),
  deadline: day.nullable(),
  block: z.enum(DEFAULT_BLOCKS.map((block) => block.key) as [string, ...string[]]).nullable(),
  estimated_minutes: z.number().int().min(0).max(600).nullable(),
  lead_id: id.nullable(),
  milestone: z.enum(MILESTONE_VALUES).nullable(),
});

export type NewTaskInput = z.input<typeof newTaskSchema>;

export async function createTask(input: NewTaskInput) {
  const values = newTaskSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gtm_tasks")
    .insert({ ...values, source: "user" })
    .select("id")
    .single();
  if (error) throw error;
  await logEvents(supabase, [{ task_id: data.id as string, kind: "created", note: "Added by you" }]);
  refresh();
}

// ---------------------------------------------------------------------------
// Morning check-in, end-of-day review, weekly review

const checkInSchema = z.object({
  objective: text(500),
  top_tasks: z.array(z.string().trim().min(1).max(300)).max(3),
  meetings: text(1000),
  morning_blockers: text(1000),
});
export type CheckInInput = z.input<typeof checkInSchema>;

export async function saveCheckIn(date: string, input: CheckInInput) {
  const values = checkInSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("daily_reviews").upsert(
    {
      day: day.parse(date),
      ...values,
      checked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "day" }
  );
  if (error) throw error;
  refresh();
}

const dailyReviewSchema = z.object({
  completed_summary: text(2000),
  first_contacts: z.number().int().min(0).max(500).nullable(),
  follow_ups: z.number().int().min(0).max(500).nullable(),
  responses: text(1000),
  calls_booked: z.number().int().min(0).max(100).nullable(),
  calls_completed: z.number().int().min(0).max(100).nullable(),
  obstacles: text(1000),
  tomorrow_top: text(300),
});
export type DailyReviewInput = z.input<typeof dailyReviewSchema>;

/** Saves the end-of-day review (allowed with tasks still open) and ticks the review task. */
export async function saveDailyReview(date: string, input: DailyReviewInput) {
  const values = dailyReviewSchema.parse(input);
  const reviewDay = day.parse(date);
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("daily_reviews")
    .upsert({ day: reviewDay, ...values, submitted_at: now, updated_at: now }, { onConflict: "day" });
  if (error) throw error;

  // Submitting the review IS the review task's action.
  const { data: reviewTask } = await supabase
    .from("gtm_tasks")
    .update({ status: "completed", completed_at: now, status_reason: "Review submitted", updated_at: now })
    .eq("source_key", `recurring:${reviewDay}:review`)
    .neq("status", "completed")
    .select("id");
  await logEvents(
    supabase,
    (reviewTask ?? []).map((row) => ({
      task_id: row.id as string,
      kind: "status",
      to_value: "completed",
      note: "Review submitted",
    }))
  );
  refresh();
}

const weeklyReviewSchema = z.object({
  what_worked: text(2000),
  what_didnt: text(2000),
  best_industry: text(300),
  best_message: text(1000),
  change_next_week: text(2000),
});
export type WeeklyReviewInput = z.input<typeof weeklyReviewSchema>;

export async function saveWeeklyReview(weekStart: string, reviewDay: string, input: WeeklyReviewInput) {
  const values = weeklyReviewSchema.parse(input);
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("weekly_reviews")
    .upsert(
      { week_start: day.parse(weekStart), ...values, submitted_at: now, updated_at: now },
      { onConflict: "week_start" }
    );
  if (error) throw error;

  const { data: reviewTask } = await supabase
    .from("gtm_tasks")
    .update({ status: "completed", completed_at: now, status_reason: "Weekly review submitted", updated_at: now })
    .eq("source_key", `recurring:${day.parse(reviewDay)}:weekly-review`)
    .neq("status", "completed")
    .select("id");
  await logEvents(
    supabase,
    (reviewTask ?? []).map((row) => ({
      task_id: row.id as string,
      kind: "status",
      to_value: "completed",
      note: "Weekly review submitted",
    }))
  );
  refresh();
}

// ---------------------------------------------------------------------------
// Planner settings

const settingsSchema = z.object({
  day_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM."),
  block_minutes: z.record(z.string(), z.number().int().min(0).max(240)),
});
export type PlannerSettingsInput = z.input<typeof settingsSchema>;

export async function savePlannerSettings(input: PlannerSettingsInput) {
  const values = settingsSchema.parse(input);
  const known = new Set(DEFAULT_BLOCKS.map((block) => block.key as string));
  const blockMinutes = Object.fromEntries(Object.entries(values.block_minutes).filter(([key]) => known.has(key)));
  const supabase = await createClient();
  const { error } = await supabase
    .from("planner_settings")
    .upsert(
      { id: 1, day_start: values.day_start, block_minutes: blockMinutes, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  if (error) throw error;
  refresh();
}
