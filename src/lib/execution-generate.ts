// Server-side: prepares the day's GTM tasks and counts real activity.
// Called on every load of /admin/execution. Idempotent — every generated task
// has a stable source_key (unique in the database), inserts skip existing
// keys, and user changes to a task are never overwritten.
import type { createClient } from "@/lib/supabase/server";
import { osloToday } from "@/lib/gtm-logic";
import {
  GATE_DATE,
  pipelineTasks,
  recurringTasks,
  roadmapTasks,
  segmentSeconds,
  settleTasks,
  type PipelineCall,
  type PipelineLead,
  type PlannedTask,
} from "@/lib/execution-plan";
import { buildPerformance } from "@/lib/gtm-dashboard";
import { followUpDate, type PotentialCustomer } from "@/lib/potential-customer";
import type { DiscoveryCall } from "@/lib/discovery-call";
import type { LeadCandidate } from "@/lib/lead-candidate";
import type { LeadMessage } from "@/lib/outreach-templates";
import type { ResearchRun } from "@/lib/gtm-dashboard";
import type { GtmTask } from "@/lib/execution-tasks";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ExecutionData = {
  leads: PotentialCustomer[];
  candidates: LeadCandidate[];
  calls: DiscoveryCall[];
  messages: LeadMessage[];
  runs: ResearchRun[];
};

const FIRST_CONTACT_KINDS = ["connection_note", "first_message", "email"];

/** Real activity on one Oslo day, from the records — never from task checkboxes. */
export function activityOn(day: string, data: ExecutionData) {
  const onDay = (iso: string | null | undefined) => Boolean(iso) && osloToday(new Date(iso as string)) === day;
  const dayMessages = data.messages.filter((m) => onDay(m.created_at));
  return {
    firstContacts: new Set(dayMessages.filter((m) => FIRST_CONTACT_KINDS.includes(m.kind)).map((m) => m.lead_id)).size,
    followUps: dayMessages.filter((m) => m.kind === "follow_up").length,
    researched: data.runs.filter((r) => r.outcome === "researched" && onDay(r.created_at)).length,
    approved: data.candidates.filter((c) => c.status === "approved" && onDay(c.updated_at)).length,
    callsBooked: data.calls.filter((c) => onDay(c.created_at)).length,
    callsCompleted: data.calls.filter((c) => c.status === "completed" && c.completed_on === day).length,
    responses: data.leads.filter((l) => l.responded && onDay(l.updated_at)).length,
  };
}

const leadName = (lead: PotentialCustomer) => lead.company || lead.name;

/** The pipeline in the plain shape the pure task rules take. */
function pipeline(data: ExecutionData) {
  const callLeads = new Set(data.calls.filter((c) => c.status !== "cancelled").map((c) => c.lead_id));
  const leads: PipelineLead[] = data.leads.map((lead) => ({
    id: lead.id,
    name: leadName(lead),
    status: lead.status,
    responded: lead.responded,
    followUpDue: followUpDate(lead),
    nextAction: lead.next_action ?? null,
    hasCall: callLeads.has(lead.id),
  }));
  const calls: PipelineCall[] = data.calls.map((call) => ({
    id: call.id,
    leadId: call.lead_id,
    status: call.status,
    scheduledOn: call.scheduled_on,
  }));
  return { leads, calls };
}

function toRow(task: PlannedTask & { leadId?: string }, source: GtmTask["source"]) {
  return {
    title: task.title,
    description: task.description ?? null,
    category: task.category,
    priority: task.priority,
    planned_date: task.date,
    block: task.block,
    estimated_minutes: task.minutes,
    milestone: task.milestone ?? null,
    source,
    source_key: task.sourceKey,
    lead_id: task.leadId ?? null,
  };
}

/** Stops running timers, adding each running stretch (capped) to the task's total. */
async function bankTimers(
  supabase: SupabaseClient,
  rows: { id: unknown; tracked_seconds: unknown; timer_started_at: unknown }[]
) {
  const now = new Date();
  for (const row of rows) {
    await supabase
      .from("gtm_tasks")
      .update({
        tracked_seconds: Number(row.tracked_seconds ?? 0) + segmentSeconds(row.timer_started_at as string | null, now),
        timer_started_at: null,
      })
      .eq("id", row.id as string);
  }
}

export async function logEvents(
  supabase: SupabaseClient,
  events: {
    task_id: string;
    kind: string;
    from_value?: string | null;
    to_value?: string | null;
    note?: string | null;
  }[]
) {
  if (events.length === 0) return;
  const { error } = await supabase.from("gtm_task_events").insert(events);
  if (error) console.error("Failed to record task history:", error);
}

/**
 * Prepares `today`: marks past open tasks as missed (they stay visible until
 * resolved), inserts roadmap/recurring/pipeline tasks that don't exist yet,
 * and completes tasks only where the real action is on record.
 */
export async function prepareDay(supabase: SupabaseClient, today: string, data: ExecutionData) {
  const now = new Date().toISOString();

  // 1. Insert what's missing. ignoreDuplicates = ON CONFLICT DO NOTHING on
  //    source_key, and only the newly inserted rows come back.
  const performance = buildPerformance({ ...data, today });
  const qualified = performance.funnel.find((row) => row.label === "Qualified opportunities")?.value ?? 0;
  const planned = [
    ...roadmapTasks({
      includeFinalDays: today >= GATE_DATE,
      gateMet: performance.gate.verdict === "met",
      qualifiedLeads: qualified,
    }).map((task) => toRow(task, "roadmap")),
    ...recurringTasks(today).map((task) => toRow(task, "recurring")),
    ...pipelineTasks({
      today,
      ...pipeline(data),
      failedResearch: data.candidates.filter((c) => c.status === "failed").length,
    }).map((task) => toRow(task, "crm")),
  ];
  const { data: inserted, error: insertError } = await supabase
    .from("gtm_tasks")
    .upsert(planned, { onConflict: "source_key", ignoreDuplicates: true })
    .select("id");
  if (insertError) throw insertError;
  await logEvents(
    supabase,
    (inserted ?? []).map((row) => ({ task_id: row.id as string, kind: "created", note: "Generated from the plan" }))
  );

  // 2. Unfinished work from earlier days (including roadmap tasks just
  //    created for days that already passed) becomes "missed" — never deleted, never
  //    silently carried forward; it waits in the rescheduling queue.
  //    A timer still running from an earlier day is stopped and banked first.
  await bankTimers(
    supabase,
    (
      await supabase
        .from("gtm_tasks")
        .select("id, tracked_seconds, timer_started_at")
        .lt("planned_date", today)
        .not("timer_started_at", "is", null)
    ).data ?? []
  );
  const { data: overdue } = await supabase
    .from("gtm_tasks")
    .update({ status: "missed", updated_at: now })
    .lt("planned_date", today)
    .in("status", ["not_started", "in_progress"])
    .select("id");
  await logEvents(
    supabase,
    (overdue ?? []).map((row) => ({
      task_id: row.id as string,
      kind: "status",
      to_value: "missed",
      note: "Day ended unfinished",
    }))
  );

  // 3. Complete (or retire) generated tasks from real records only.
  const { data: open } = await supabase
    .from("gtm_tasks")
    .select("id, source_key, lead_id, created_at, tracked_seconds, timer_started_at")
    .in("status", ["not_started", "in_progress", "missed"])
    .not("source_key", "is", null);
  const activity = activityOn(today, data);
  const updates = settleTasks({
    today,
    tasks: (open ?? []).map((row) => ({
      id: row.id as string,
      sourceKey: row.source_key as string,
      leadId: (row.lead_id as string | null) ?? null,
      createdAt: row.created_at as string,
    })),
    firstContactsToday: activity.firstContacts,
    researchedToday: activity.researched + activity.approved,
    followUpMessages: data.messages
      .filter((m) => m.kind === "follow_up")
      .map((m) => ({ leadId: m.lead_id, createdAt: m.created_at })),
    ...pipeline(data),
  });

  // Settled tasks stop their timer (time banked) before the status changes.
  const settledIds = new Set(updates.map((update) => update.id));
  await bankTimers(
    supabase,
    (open ?? []).filter((row) => settledIds.has(row.id as string) && row.timer_started_at)
  );
  for (const update of updates) {
    await supabase
      .from("gtm_tasks")
      .update({
        status: update.status,
        status_reason: update.reason,
        completed_at: update.status === "completed" ? now : null,
        updated_at: now,
      })
      .eq("id", update.id);
  }
  await logEvents(
    supabase,
    updates.map((update) => ({ task_id: update.id, kind: "status", to_value: update.status, note: update.reason }))
  );
}
