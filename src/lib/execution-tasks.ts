import type { BlockKey, Milestone, TaskCategory, TaskPriority } from "@/lib/execution-plan";

// Keep these value lists in sync with the checks in supabase/daily_execution.sql.
export const TASK_STATUS_VALUES = [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
  "deferred",
  "missed",
  "cancelled",
] as const;
export type GtmTaskStatus = (typeof TASK_STATUS_VALUES)[number];

export const taskStatusLabels: Record<GtmTaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
  deferred: "Deferred",
  missed: "Missed",
  cancelled: "Cancelled",
};

export const TASK_PRIORITY_VALUES = ["critical", "high", "normal", "low"] as const;
export const taskPriorityLabels: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const TASK_CATEGORY_VALUES = [
  "planning",
  "research",
  "outreach",
  "linkedin",
  "follow_up",
  "sales_call",
  "gtm_project",
  "review",
] as const;
export const taskCategoryLabels: Record<TaskCategory, string> = {
  planning: "Planning",
  research: "Research",
  outreach: "Outreach",
  linkedin: "LinkedIn",
  follow_up: "Follow-up",
  sales_call: "Sales call",
  gtm_project: "GTM project",
  review: "Review",
};

export const MILESTONE_VALUES = ["discovery", "pilot_offers", "first_pilot"] as const;
export const milestoneLabels: Record<Milestone, string> = {
  discovery: "Discovery",
  pilot_offers: "Pilot offers",
  first_pilot: "First pilot",
};

export type GtmTask = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: GtmTaskStatus;
  planned_date: string | null;
  deadline: string | null;
  block: BlockKey | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  started_at: string | null;
  completed_at: string | null;
  tracked_seconds: number;
  timer_started_at: string | null;
  lead_id: string | null;
  milestone: Milestone | null;
  source: "roadmap" | "recurring" | "crm" | "user";
  source_key: string | null;
  notes: string | null;
  recurrence: string | null;
  status_reason: string | null;
};

export type GtmTaskEvent = {
  id: string;
  created_at: string;
  task_id: string;
  kind: "created" | "status" | "rescheduled" | "deadline" | "priority" | "note" | "linked";
  from_value: string | null;
  to_value: string | null;
  note: string | null;
};

export type DailyReview = {
  day: string;
  objective: string | null;
  top_tasks: string[];
  meetings: string | null;
  morning_blockers: string | null;
  checked_in_at: string | null;
  completed_summary: string | null;
  first_contacts: number | null;
  follow_ups: number | null;
  responses: string | null;
  calls_booked: number | null;
  calls_completed: number | null;
  obstacles: string | null;
  tomorrow_top: string | null;
  submitted_at: string | null;
};

export type WeeklyReview = {
  week_start: string;
  what_worked: string | null;
  what_didnt: string | null;
  best_industry: string | null;
  best_message: string | null;
  change_next_week: string | null;
  submitted_at: string | null;
};

/** Open = still needs doing (shows in plans and the rescheduling queue). */
export const OPEN_STATUSES: readonly GtmTaskStatus[] = ["not_started", "in_progress", "blocked", "missed"];
