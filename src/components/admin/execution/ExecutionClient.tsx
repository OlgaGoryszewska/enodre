"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, History, Loader2, Pause, Play, Plus, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CheckInInput,
  DailyReviewInput,
  NewTaskInput,
  PlannerSettingsInput,
  TaskAction,
  WeeklyReviewInput,
} from "@/app/admin/execution/actions";
import {
  TASK_CATEGORY_VALUES,
  TASK_PRIORITY_VALUES,
  taskCategoryLabels,
  taskPriorityLabels,
  taskStatusLabels,
  type GtmTask,
  type GtmTaskEvent,
  type GtmTaskStatus,
} from "@/lib/execution-tasks";
import { formatDuration, formatTimer, trackedSeconds, type BlockConfig } from "@/lib/execution-plan";

const selectClass =
  "h-9 rounded-xl border border-black/10 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

const priorityDot: Record<GtmTask["priority"], string> = {
  critical: "bg-danger",
  high: "bg-foreground",
  normal: "bg-black/30",
  low: "bg-black/15",
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatDay(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export type LeadOption = { id: string; label: string };

export type TaskActions = {
  onStatus: (taskId: string, action: TaskAction) => Promise<void>;
  onReschedule: (taskId: string, date: string) => Promise<void>;
  onDeadline: (taskId: string, date: string | null) => Promise<void>;
  onPriority: (taskId: string, priority: string) => Promise<void>;
  onNote: (taskId: string, note: string) => Promise<void>;
  onLink: (taskId: string, leadId: string | null) => Promise<void>;
  onHistory: (taskId: string) => Promise<GtmTaskEvent[]>;
};

type Panel = "defer" | "block" | "cancel" | "note" | "more" | "history" | null;

/** One task: check off in place, start/pause, and the rest behind "More". */
/** Ticks every second while a task's timer runs. */
export function LiveTimer({
  task,
  className,
}: {
  task: Pick<GtmTask, "tracked_seconds" | "timer_started_at" | "estimated_minutes">;
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const seconds = trackedSeconds(task, now);
  const over = task.estimated_minutes != null && seconds > task.estimated_minutes * 60;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        over ? "bg-[#FFF4E0] text-[#9A6200]" : "bg-accent/10 text-accent",
        className
      )}
      title={over ? "Past the estimate" : "Time tracked"}
    >
      <Timer className="h-3 w-3" aria-hidden="true" />
      {formatTimer(seconds)}
    </span>
  );
}

/** The task whose timer is running — always visible at the top of Today. */
export function RunningTaskBar({ task, actions }: { task: GtmTask; actions: TaskActions }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: "pause" | "complete") {
    setBusy(true);
    setError(null);
    try {
      await actions.onStatus(task.id, { action });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sticky top-3 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-card px-4 py-3 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Running</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{task.title}</span>
      <LiveTimer task={task} className="text-sm" />
      {task.estimated_minutes != null && (
        <span className="text-xs text-ink-muted">est. {task.estimated_minutes} min</span>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void run("pause")}
        className={cn(buttonVariants({ variant: "outline" }), "px-3 py-1.5 text-xs")}
      >
        <Pause className="h-3.5 w-3.5" aria-hidden="true" /> Pause
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run("complete")}
        className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-3 py-1.5 text-xs")}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        )}{" "}
        Complete
      </button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </div>
  );
}

export type TaskTime = { start: string; end: string; overflows: boolean };

export function TaskRow({
  task: serverTask,
  actions,
  leads,
  today,
  time,
}: {
  task: GtmTask;
  actions: TaskActions;
  leads: LeadOption[];
  today: string;
  time?: TaskTime; // the task's clock slot in today's plan
}) {
  const [busy, setBusy] = useState(false);
  // Optimistic status: the row changes on click; the server confirms (or the
  // change is rolled back with a message).
  const [optimistic, setOptimistic] = useState<Partial<GtmTask> | null>(null);
  const [syncedKey, setSyncedKey] = useState(
    `${serverTask.status}|${serverTask.timer_started_at}|${serverTask.tracked_seconds}`
  );
  const serverKey = `${serverTask.status}|${serverTask.timer_started_at}|${serverTask.tracked_seconds}`;
  if (serverKey !== syncedKey) {
    setSyncedKey(serverKey);
    setOptimistic(null);
  }
  const task: GtmTask = optimistic ? { ...serverTask, ...optimistic } : serverTask;
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [events, setEvents] = useState<GtmTaskEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = task.status === "completed";
  const lead = leads.find((option) => option.id === task.lead_id);

  async function quickStatus(action: "complete" | "reopen" | "start" | "pause") {
    const next: GtmTaskStatus =
      action === "complete" ? "completed" : action === "start" ? "in_progress" : "not_started";
    // Mirror the server's timer rules so the row (and its clock) change at once.
    const now = new Date();
    setOptimistic(
      action === "start"
        ? { status: next, timer_started_at: task.timer_started_at ?? now.toISOString() }
        : { status: next, tracked_seconds: trackedSeconds(task, now), timer_started_at: null }
    );
    setError(null);
    try {
      await actions.onStatus(serverTask.id, { action });
    } catch (err) {
      setOptimistic(null);
      setError(`Not saved: ${errorText(err)}`);
    }
  }

  async function run(action: () => Promise<void>, close = true) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (close) {
        setPanel(null);
        setReason("");
        setDate("");
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={cn(
        "rounded-xl border bg-background px-3 py-2.5",
        task.status === "missed" ? "border-danger/40" : "border-black/10"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          aria-pressed={done}
          disabled={busy}
          onClick={() => void quickStatus(done ? "reopen" : "complete")}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition sm:h-5 sm:w-5",
            done ? "border-foreground bg-foreground text-background" : "border-black/30 hover:border-foreground"
          )}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            done && <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          {time && (
            <p className={cn("text-xs font-semibold tabular-nums", time.overflows ? "text-danger" : "text-ink-muted")}>
              {time.start}–{time.end}
              {time.overflows && " · runs past this block"}
            </p>
          )}
          <p className={cn("text-sm font-medium", done && "text-ink-muted line-through")}>
            <span
              className={cn("mr-2 inline-block h-2 w-2 rounded-full align-middle", priorityDot[task.priority])}
              title={taskPriorityLabels[task.priority]}
            />
            {task.title}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {[
              !task.timer_started_at &&
                task.tracked_seconds > 0 &&
                `tracked ${formatDuration(task.tracked_seconds)}${task.estimated_minutes != null ? ` of ${task.estimated_minutes} min est.` : ""}`,
              !(task.tracked_seconds > 0) && task.estimated_minutes != null && `${task.estimated_minutes} min`,
              task.status !== "not_started" && task.status !== "completed" && taskStatusLabels[task.status],
              task.status_reason,
              task.deadline && `due ${formatDay(task.deadline)}${task.deadline < today && !done ? " (overdue)" : ""}`,
            ]
              .filter(Boolean)
              .join(" · ")}
            {lead && (
              <>
                {" · "}
                <Link
                  href={`/admin/marketing/leads/${lead.id}`}
                  className="font-semibold text-foreground hover:underline"
                >
                  {lead.label}
                </Link>
              </>
            )}
          </p>
          {task.description && !done && <p className="mt-1 text-xs leading-5 text-ink-muted">{task.description}</p>}
        </div>
        {!done && (
          <div className="flex shrink-0 items-center gap-1">
            {task.timer_started_at && <LiveTimer task={task} />}
            {task.status === "in_progress" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void quickStatus("pause")}
                aria-label="Pause"
                className="rounded-full p-2.5 text-ink-muted hover:bg-black/5 hover:text-foreground sm:p-1.5"
              >
                <Pause className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void quickStatus("start")}
                aria-label="Start"
                className="rounded-full p-2.5 text-ink-muted hover:bg-black/5 hover:text-foreground sm:p-1.5"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setPanel(panel === "more" ? null : "more")}
              className="rounded-full px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-black/5 hover:text-foreground sm:px-2 sm:py-1"
            >
              More
            </button>
          </div>
        )}
      </div>

      {panel === "more" && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-black/10 pt-2 text-xs">
          {(["defer", "block", "cancel", "note"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setPanel(kind)}
              className="rounded-full border border-black/10 px-3 py-1 font-semibold hover:border-black/30"
            >
              {kind === "defer" ? "Defer" : kind === "block" ? "Blocked" : kind === "cancel" ? "Cancel" : "Add note"}
            </button>
          ))}
          <label className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-0.5">
            Priority
            <select
              className="bg-transparent"
              value={task.priority}
              onChange={(e) => void run(() => actions.onPriority(task.id, e.target.value), false)}
            >
              {TASK_PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {taskPriorityLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-0.5">
            Deadline
            <input
              type="date"
              className="bg-transparent"
              defaultValue={task.deadline ?? ""}
              onChange={(e) => void run(() => actions.onDeadline(task.id, e.target.value || null), false)}
            />
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-0.5">
            Lead
            <select
              className="max-w-40 bg-transparent"
              value={task.lead_id ?? ""}
              onChange={(e) => void run(() => actions.onLink(task.id, e.target.value || null), false)}
            >
              <option value="">None</option>
              {leads.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              void run(async () => {
                setEvents(await actions.onHistory(task.id));
                setPanel("history");
              }, false)
            }
            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 font-semibold hover:border-black/30"
          >
            <History className="h-3 w-3" aria-hidden="true" /> History
          </button>
        </div>
      )}

      {panel === "defer" && (
        <div className="mt-2 grid gap-2 border-t border-black/10 pt-2 text-sm sm:grid-cols-[auto_1fr_auto]">
          <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          <Input
            placeholder="Reason (needed if no date)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9"
          />
          <button
            type="button"
            disabled={busy || (!date && !reason.trim())}
            onClick={() =>
              void run(() =>
                actions.onStatus(task.id, { action: "defer", date: date || null, reason: reason.trim() || null })
              )
            }
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-1.5 text-sm")}
          >
            Defer
          </button>
        </div>
      )}
      {(panel === "block" || panel === "cancel" || panel === "note") && (
        <div className="mt-2 flex gap-2 border-t border-black/10 pt-2">
          <Input
            autoFocus
            placeholder={panel === "block" ? "What's blocking it?" : panel === "cancel" ? "Why cancel it?" : "Note"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9"
          />
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() =>
              void run(() =>
                panel === "note"
                  ? actions.onNote(task.id, reason)
                  : actions.onStatus(
                      task.id,
                      panel === "block" ? { action: "block", reason } : { action: "cancel", reason }
                    )
              )
            }
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-1.5 text-sm")}
          >
            Save
          </button>
        </div>
      )}
      {panel === "history" && events && (
        <ul className="mt-2 grid gap-1 border-t border-black/10 pt-2 text-xs text-ink-muted">
          {events.length === 0 && <li>No history yet.</li>}
          {events.map((event) => (
            <li key={event.id}>
              {new Date(event.created_at).toLocaleString("en-GB", {
                timeZone: "Europe/Oslo",
                dateStyle: "short",
                timeStyle: "short",
              })}{" "}
              ·{" "}
              {event.kind === "rescheduled"
                ? `moved ${event.from_value ?? "—"} → ${event.to_value}`
                : event.kind === "status"
                  ? `${event.from_value ? `${event.from_value} → ` : ""}${event.to_value}`
                  : event.kind}
              {event.note && ` — ${event.note}`}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </li>
  );
}

export function TaskList({
  tasks,
  times,
  ...rest
}: {
  tasks: GtmTask[];
  times?: Record<string, TaskTime>;
  actions: TaskActions;
  leads: LeadOption[];
  today: string;
}) {
  if (tasks.length === 0) return <p className="text-xs text-ink-muted">Nothing planned.</p>;
  return (
    <ul className="grid gap-1.5">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} time={times?.[task.id]} {...rest} />
      ))}
    </ul>
  );
}

/** Add your own task (source = user). */
export function AddTaskForm({
  today,
  blocks,
  leads,
  onCreate,
}: {
  today: string;
  blocks: BlockConfig[];
  leads: LeadOption[];
  onCreate: (input: NewTaskInput) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewTaskInput>({
    title: "",
    description: "",
    category: "gtm_project",
    priority: "normal",
    planned_date: today,
    deadline: null,
    block: "gtm",
    estimated_minutes: 30,
    lead_id: null,
    milestone: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-foreground"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add a task
      </button>
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onCreate(form);
      setForm({ ...form, title: "", description: "" });
      setOpen(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border border-black/10 bg-background p-3">
      <Input placeholder="Task" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        <select
          className={selectClass}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as NewTaskInput["category"] })}
        >
          {TASK_CATEGORY_VALUES.map((value) => (
            <option key={value} value={value}>
              {taskCategoryLabels[value]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value as NewTaskInput["priority"] })}
        >
          {TASK_PRIORITY_VALUES.map((value) => (
            <option key={value} value={value}>
              {taskPriorityLabels[value]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={form.block ?? ""}
          onChange={(e) => setForm({ ...form, block: e.target.value || null })}
        >
          {blocks
            .filter((block) => !block.isBreak)
            .map((block) => (
              <option key={block.key} value={block.key}>
                {block.label}
              </option>
            ))}
        </select>
        <Input
          type="date"
          className="h-9 w-auto"
          value={form.planned_date ?? ""}
          onChange={(e) => setForm({ ...form, planned_date: e.target.value || null })}
        />
        <Input
          type="number"
          min={0}
          className="h-9 w-24"
          value={form.estimated_minutes ?? ""}
          onChange={(e) =>
            setForm({ ...form, estimated_minutes: e.target.value === "" ? null : Number(e.target.value) })
          }
          aria-label="Minutes"
        />
        <select
          className={selectClass}
          value={form.lead_id ?? ""}
          onChange={(e) => setForm({ ...form, lead_id: e.target.value || null })}
        >
          <option value="">No lead</option>
          {leads.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !form.title.trim()}
          onClick={() => void submit()}
          className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-1.5 text-sm")}
        >
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-2 text-sm font-semibold text-ink-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

/** Morning check-in, prefilled from the plan and the CRM — confirm in one click. */
export function CheckInCard({
  day,
  initial,
  context = [],
  onSave,
}: {
  day: string;
  initial: CheckInInput;
  // Read-only facts from the CRM shown for the check-in (calls, overdue follow-ups).
  context?: { label: string; items: string[] }[];
  onSave: (day: string, input: CheckInInput) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tops = [...form.top_tasks, "", "", ""].slice(0, 3);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(day, { ...form, top_tasks: form.top_tasks.filter((value) => value.trim()) });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-foreground/20 bg-card p-5">
      <div>
        <h2 className="font-semibold">Morning check-in</h2>
        <p className="text-sm text-ink-muted">Prepared from your plan and pipeline. Change anything, then confirm.</p>
      </div>
      {context.some((group) => group.items.length > 0) && (
        <div className="grid gap-3 rounded-xl bg-black/[0.03] p-3 text-sm sm:grid-cols-2">
          {context.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{group.label}</p>
              {group.items.length === 0 ? (
                <p className="text-ink-muted">None</p>
              ) : (
                <ul className="mt-1 grid gap-0.5">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      <Field label="Today's main objective">
        <Input value={form.objective ?? ""} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
      </Field>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Three most important tasks</span>
        {tops.map((value, index) => (
          <Input
            key={index}
            value={value}
            onChange={(e) => {
              const next = [...tops];
              next[index] = e.target.value;
              setForm({ ...form, top_tasks: next });
            }}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Meetings today">
          <Input value={form.meetings ?? ""} onChange={(e) => setForm({ ...form, meetings: e.target.value })} />
        </Field>
        <Field label="Blockers">
          <Input
            value={form.morning_blockers ?? ""}
            onChange={(e) => setForm({ ...form, morning_blockers: e.target.value })}
          />
        </Field>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className={cn(buttonVariants({ variant: "primary" }), "justify-self-start bg-foreground px-5 py-2 text-sm")}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Confirm and start the day
      </button>
    </div>
  );
}

/** End-of-day review, prefilled from real records; can be sent with tasks still open. */
export function DailyReviewForm({
  day,
  initial,
  submitted,
  onSave,
}: {
  day: string;
  initial: DailyReviewInput;
  submitted: boolean;
  onSave: (day: string, input: DailyReviewInput) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    submitted ? "Review saved. You can update it until tomorrow." : null
  );

  async function save() {
    setBusy(true);
    try {
      await onSave(day, form);
      setMessage("Review saved.");
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const number = (value: string) => (value === "" ? null : Math.max(0, Math.round(Number(value))));
  return (
    <div className="grid gap-3">
      <Field label="1. What did you complete today?">
        <Textarea
          rows={3}
          value={form.completed_summary ?? ""}
          onChange={(e) => setForm({ ...form, completed_summary: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="2. First contacts sent">
          <Input
            type="number"
            min={0}
            value={form.first_contacts ?? ""}
            onChange={(e) => setForm({ ...form, first_contacts: number(e.target.value) })}
          />
        </Field>
        <Field label="3. Follow-ups completed">
          <Input
            type="number"
            min={0}
            value={form.follow_ups ?? ""}
            onChange={(e) => setForm({ ...form, follow_ups: number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="4. Did any prospects respond?">
        <Input value={form.responses ?? ""} onChange={(e) => setForm({ ...form, responses: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="5. Discovery calls booked">
          <Input
            type="number"
            min={0}
            value={form.calls_booked ?? ""}
            onChange={(e) => setForm({ ...form, calls_booked: number(e.target.value) })}
          />
        </Field>
        <Field label="6. Discovery calls completed">
          <Input
            type="number"
            min={0}
            value={form.calls_completed ?? ""}
            onChange={(e) => setForm({ ...form, calls_completed: number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="7. What blocked your progress?">
        <Input value={form.obstacles ?? ""} onChange={(e) => setForm({ ...form, obstacles: e.target.value })} />
      </Field>
      <Field label="8. Most important task for tomorrow">
        <Input value={form.tomorrow_top ?? ""} onChange={(e) => setForm({ ...form, tomorrow_top: e.target.value })} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-5 py-2 text-sm")}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save review
        </button>
        {message && <p className="text-sm text-ink-muted">{message}</p>}
      </div>
    </div>
  );
}

export function WeeklyReviewForm({
  weekStart,
  reviewDay,
  initial,
  onSave,
}: {
  weekStart: string;
  reviewDay: string;
  initial: WeeklyReviewInput;
  onSave: (weekStart: string, reviewDay: string, input: WeeklyReviewInput) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fields: [keyof WeeklyReviewInput, string][] = [
    ["what_worked", "What worked?"],
    ["what_didnt", "What didn't work?"],
    ["best_industry", "Which industry showed the strongest potential?"],
    ["best_message", "Which outreach message performed best?"],
    ["change_next_week", "What should change next week?"],
  ];
  return (
    <div className="grid gap-3">
      {fields.map(([key, label]) => (
        <Field key={key} label={label}>
          <Textarea rows={2} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        </Field>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(weekStart, reviewDay, form);
              setMessage("Weekly review saved.");
            } catch (err) {
              setMessage(errorText(err));
            } finally {
              setBusy(false);
            }
          }}
          className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-5 py-2 text-sm")}
        >
          Save weekly review
        </button>
        {message && <p className="text-sm text-ink-muted">{message}</p>}
      </div>
    </div>
  );
}

/** Missed and deferred tasks — you decide: reschedule, block or cancel. Nothing moves on its own. */
export function RescheduleQueue({
  tasks,
  today,
  onReschedule,
  onStatus,
}: {
  tasks: GtmTask[];
  today: string;
  onReschedule: (taskId: string, date: string) => Promise<void>;
  onStatus: (taskId: string, action: TaskAction) => Promise<void>;
}) {
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (tasks.length === 0) return null;

  async function run(taskId: string, action: () => Promise<void>) {
    setBusyId(taskId);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-danger/30 bg-card p-5">
      <h2 className="font-semibold">Needs rescheduling ({tasks.length})</h2>
      <p className="text-sm text-ink-muted">Unfinished from earlier days. Pick a day, mark it blocked, or cancel it.</p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ul className="mt-3 grid gap-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-background px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{task.title}</p>
              <p className="text-xs text-ink-muted">
                {task.status === "deferred"
                  ? `Deferred — ${task.status_reason ?? "no date"}`
                  : `Planned ${task.planned_date ? formatDay(task.planned_date) : "—"}`}
              </p>
            </div>
            <Input
              type="date"
              min={today}
              className="h-9 w-auto"
              value={dates[task.id] ?? today}
              onChange={(e) => setDates({ ...dates, [task.id]: e.target.value })}
            />
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void run(task.id, () => onReschedule(task.id, dates[task.id] ?? today))}
              className={cn(buttonVariants({ variant: "outline" }), "px-3 py-1.5 text-xs")}
            >
              {busyId === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Reschedule"}
            </button>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => {
                const reason = window.prompt("What's blocking it?");
                if (reason?.trim()) void run(task.id, () => onStatus(task.id, { action: "block", reason }));
              }}
              className="px-2 text-xs font-semibold text-ink-muted hover:text-foreground"
            >
              Blocked
            </button>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => {
                const reason = window.prompt("Why cancel it?");
                if (reason?.trim()) void run(task.id, () => onStatus(task.id, { action: "cancel", reason }));
              }}
              className="px-2 text-xs font-semibold text-ink-muted hover:text-danger"
            >
              Cancel
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Move a task to another day from the calendar. */
export function MoveTask({
  taskId,
  date,
  onReschedule,
}: {
  taskId: string;
  date: string;
  onReschedule: (taskId: string, date: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <input
      type="date"
      aria-label="Move to another day"
      defaultValue={date}
      disabled={busy}
      onChange={async (e) => {
        if (!e.target.value || e.target.value === date) return;
        setBusy(true);
        try {
          await onReschedule(taskId, e.target.value);
        } finally {
          setBusy(false);
        }
      }}
      className="w-[7.5rem] rounded border border-black/10 bg-background px-1 text-[11px] text-ink-muted"
    />
  );
}

export function PlannerSettingsForm({
  dayStart,
  blocks,
  onSave,
}: {
  dayStart: string;
  blocks: BlockConfig[];
  onSave: (input: PlannerSettingsInput) => Promise<void>;
}) {
  const [start, setStart] = useState(dayStart);
  const [minutes, setMinutes] = useState<Record<string, number>>(
    Object.fromEntries(blocks.map((block) => [block.key, block.minutes]))
  );
  const [message, setMessage] = useState<string | null>(null);
  const total = Object.values(minutes).reduce((sum, value) => sum + value, 0);
  return (
    <div className="grid max-w-lg gap-3">
      <Field label="Working day starts (Oslo time)">
        <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-40" />
      </Field>
      <ul className="grid gap-2">
        {blocks.map((block) => (
          <li key={block.key} className="flex items-center justify-between gap-3 text-sm">
            <span className={cn(block.isBreak && "text-ink-muted")}>{block.label}</span>
            <span className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={240}
                value={minutes[block.key]}
                onChange={(e) => setMinutes({ ...minutes, [block.key]: Number(e.target.value) })}
                className="h-9 w-20"
              />
              min
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">
        Total {Math.floor(total / 60)} h {total % 60} min including breaks.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            try {
              await onSave({ day_start: start.slice(0, 5), block_minutes: minutes });
              setMessage("Saved.");
            } catch (err) {
              setMessage(errorText(err));
            }
          }}
          className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-5 py-2 text-sm")}
        >
          Save schedule
        </button>
        {message && <p className="text-sm text-ink-muted">{message}</p>}
      </div>
    </div>
  );
}
