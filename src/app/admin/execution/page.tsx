import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { osloToday, startOfWeek } from "@/lib/gtm-logic";
import {
  DEFAULT_BLOCKS,
  DEFAULT_DAY_START,
  PLAN_DAYS,
  PLAN_END,
  PLAN_START,
  ROADMAP_WEEKS,
  addDays,
  currentBlock,
  isWorkingDay,
  nextWorkingDay,
  planDayNumber,
  scheduleBlocks,
  scoreDay,
  resolveTargets,
  slotTasks,
  minutesBetween,
  trackedSeconds,
  formatDuration,
  workingDays,
  type BlockConfig,
} from "@/lib/execution-plan";
import { activityOn, prepareDay, type ExecutionData } from "@/lib/execution-generate";
import { buildPerformance, type ResearchRun } from "@/lib/gtm-dashboard";
import { GTM_PHASES, GTM_MILESTONES, WEEKLY_TARGETS } from "@/lib/gtm-plan";
import { followUpDate, type PotentialCustomer } from "@/lib/potential-customer";
import type { LeadCandidate } from "@/lib/lead-candidate";
import type { DiscoveryCall } from "@/lib/discovery-call";
import type { LeadMessage } from "@/lib/outreach-templates";
import {
  OPEN_STATUSES,
  TASK_CATEGORY_VALUES,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
  milestoneLabels,
  taskCategoryLabels,
  taskPriorityLabels,
  taskStatusLabels,
  type DailyReview,
  type GtmTask,
  type WeeklyReview,
} from "@/lib/execution-tasks";
import {
  AddTaskForm,
  CheckInCard,
  DailyReviewForm,
  MoveTask,
  PlannerSettingsForm,
  RescheduleQueue,
  RunningTaskBar,
  TaskList,
  WeeklyReviewForm,
  type LeadOption,
} from "@/components/admin/execution/ExecutionClient";
import {
  addTaskNote,
  createTask,
  getTaskHistory,
  linkTaskToLead,
  rescheduleTask,
  saveCheckIn,
  saveDailyReview,
  savePlannerSettings,
  saveWeeklyReview,
  setTaskDeadline,
  setTaskPriority,
  updateTaskStatus,
} from "@/app/admin/execution/actions";

export const metadata: Metadata = { title: "Daily Execution" };

const TABS = [
  { key: "today", label: "Today" },
  { key: "tasks", label: "My tasks" },
  { key: "roadmap", label: "Roadmap & milestones" },
  { key: "calendar", label: "Calendar" },
  { key: "scorecard", label: "Scorecard & reviews" },
  { key: "settings", label: "Settings" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const PRIORITY_ORDER = { critical: 0, high: 1, normal: 2, low: 3 } as const;

const WHEN_OPTIONS: [string, string][] = [
  ["all", "Any date"],
  ["today", "Today"],
  ["week", "This week"],
  ["overdue", "Overdue"],
  ["upcoming", "Upcoming"],
  ["unscheduled", "Unscheduled"],
];
const STATUS_OPTIONS: [string, string][] = [
  ["open", "Open"],
  ["all", "All"],
  ...TASK_STATUS_VALUES.map((value): [string, string] => [value, taskStatusLabels[value]]),
];
const PRIORITY_OPTIONS: [string, string][] = [
  ["all", "Any priority"],
  ...TASK_PRIORITY_VALUES.map((value): [string, string] => [value, taskPriorityLabels[value]]),
];
const CATEGORY_OPTIONS: [string, string][] = [
  ["all", "Any category"],
  ...TASK_CATEGORY_VALUES.map((value): [string, string] => [value, taskCategoryLabels[value]]),
];

function formatDay(value: string, long = false) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: long ? "long" : "short",
    day: "numeric",
    month: long ? "long" : "short",
    timeZone: "UTC",
  });
}

function osloTime() {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const statusTone = {
  on_track: "bg-[#E3F3E6] text-[#1B8A3A]",
  needs_attention: "bg-[#FFF4E0] text-[#9A6200]",
  behind: "bg-danger/10 text-danger",
  not_started: "bg-black/5 text-ink-muted",
} as const;
const statusText = {
  on_track: "On track",
  needs_attention: "Needs attention",
  behind: "Behind plan",
  not_started: "Nothing due yet",
} as const;

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-black/10 bg-card p-5 sm:p-6", className)}>
      {title && <h2 className="font-semibold tracking-tight">{title}</h2>}
      {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      <div className={cn(title && "mt-4")}>{children}</div>
    </section>
  );
}

type Filters = { tab?: string; when?: string; priority?: string; status?: string; category?: string };

export default async function ExecutionPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams;
  const tabParam = params.tab;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "today";
  const supabase = await createClient();
  const today = osloToday();
  const now = osloTime();

  // Pipeline data the plan is generated from (and the metrics are counted from).
  const [leadsRes, candidatesRes, callsRes, messagesRes, runsRes, settingsRes] = await Promise.all([
    supabase.from("potential_customers").select("*"),
    supabase.from("lead_candidates").select("*"),
    supabase.from("discovery_calls").select("*").order("created_at", { ascending: false }),
    supabase.from("lead_messages").select("*"),
    supabase
      .from("lead_research_runs")
      .select("created_at, cost_usd, outcome")
      .gte("created_at", `${addDays(PLAN_START, -7)}T00:00:00Z`),
    supabase.from("planner_settings").select("*").maybeSingle(),
  ]);
  const data: ExecutionData = {
    leads: (leadsRes.data ?? []) as PotentialCustomer[],
    candidates: (candidatesRes.data ?? []) as LeadCandidate[],
    calls: (callsRes.data ?? []) as DiscoveryCall[],
    messages: (messagesRes.data ?? []) as LeadMessage[],
    runs: (runsRes.data ?? []) as ResearchRun[],
  };

  const savedSettings = settingsRes.data as {
    day_start: string;
    block_minutes: Record<string, number>;
    targets?: Record<string, unknown>;
  } | null;
  const targets = resolveTargets(savedSettings?.targets);

  let setupError: string | null = null;
  try {
    await prepareDay(supabase, today, data, targets);
  } catch (error) {
    console.error("Couldn't prepare the day's tasks:", error);
    setupError =
      "Daily Execution needs its database tables. Run supabase/daily_execution.sql in the Supabase SQL Editor, then reload.";
  }

  const [tasksRes, reviewsRes, weeklyRes] = await Promise.all([
    supabase.from("gtm_tasks").select("*").order("created_at", { ascending: true }),
    supabase
      .from("daily_reviews")
      .select("*")
      .gte("day", addDays(startOfWeek(today), -7)),
    supabase.from("weekly_reviews").select("*").eq("week_start", startOfWeek(today)).maybeSingle(),
  ]);
  const tasks = (tasksRes.data ?? []) as GtmTask[];
  const reviews = (reviewsRes.data ?? []) as DailyReview[];
  const todayReview = reviews.find((review) => review.day === today) ?? null;
  const weeklyReview = (weeklyRes.data ?? null) as WeeklyReview | null;

  // Schedule (settings override the default block lengths).
  const settings = savedSettings;
  const dayStart = settings?.day_start?.slice(0, 5) ?? DEFAULT_DAY_START;
  const blocks: BlockConfig[] = DEFAULT_BLOCKS.map((block) => ({
    ...block,
    minutes: settings?.block_minutes?.[block.key] ?? block.minutes,
  }));
  const schedule = scheduleBlocks(dayStart, blocks);
  const blockEnd = new Map(schedule.map((block) => [block.key as string, block.end]));
  const running = currentBlock(schedule, now);
  const dayEnd = schedule.at(-1)?.end ?? "16:30";
  const dayMinutes = Math.max(1, minutesBetween(dayStart, dayEnd));
  // Whole hours inside the working day, for the day view's hour marks.
  const hourMarks: string[] = [];
  for (
    let hour = Math.ceil(Number(dayStart.slice(0, 2)) + Number(dayStart.slice(3)) / 60);
    hour * 60 <= minutesBetween("00:00", dayEnd);
    hour++
  ) {
    hourMarks.push(`${String(hour).padStart(2, "0")}:00`);
  }

  const leadOptions: LeadOption[] = data.leads
    .map((lead) => ({ id: lead.id, label: lead.company || lead.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const taskActions = {
    onStatus: updateTaskStatus,
    onReschedule: rescheduleTask,
    onDeadline: setTaskDeadline,
    onPriority: setTaskPriority,
    onNote: addTaskNote,
    onLink: linkTaskToLead,
    onHistory: getTaskHistory,
  };

  const working = isWorkingDay(today);
  const planDay = planDayNumber(today);
  const week = ROADMAP_WEEKS.find((w) => today >= w.start && today <= w.end);
  const byPriority = (a: GtmTask, b: GtmTask) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
    (a.planned_date ?? "").localeCompare(b.planned_date ?? "");
  const weekStartForFilter = startOfWeek(today);
  const todayTasks = tasks.filter((task) => task.planned_date === today && task.status !== "cancelled");
  const todayDone = todayTasks.filter((task) => task.status === "completed").length;
  const loadedAt = new Date();
  const runningTask = tasks.find((task) => task.timer_started_at) ?? null;
  const trackedToday = todayTasks.reduce((sum, task) => sum + trackedSeconds(task, loadedAt), 0);
  const estimatedToday = todayTasks.reduce((sum, task) => sum + (task.estimated_minutes ?? 0), 0);
  const openToday = todayTasks.filter((task) => OPEN_STATUSES.includes(task.status));
  const nextTask =
    [...openToday].sort(
      (a, b) =>
        (blockEnd.get(a.block ?? "") ?? "99").localeCompare(blockEnd.get(b.block ?? "") ?? "99") || byPriority(a, b)
    )[0] ?? null;
  const rescheduling = tasks.filter(
    (task) =>
      task.status === "missed" ||
      (task.status === "deferred" && !task.planned_date) ||
      (task.status === "deferred" && (task.planned_date ?? "") < today)
  );
  // My tasks filters (from the URL, so a filtered view can be bookmarked).
  const when = params.when ?? "all";
  const statusFilter = params.status ?? "open";
  const priorityFilter = params.priority ?? "all";
  const categoryFilter = params.category ?? "all";
  const filteredTasks = tasks
    .filter((t) => {
      const date = t.planned_date ?? "";
      if (when === "today" && date !== today) return false;
      if (when === "week" && (date < weekStartForFilter || date > addDays(weekStartForFilter, 6))) return false;
      if (when === "overdue" && !(date && date < today && OPEN_STATUSES.includes(t.status))) return false;
      if (when === "upcoming" && !(date > today)) return false;
      if (when === "unscheduled" && t.planned_date) return false;
      if (statusFilter === "open" && !OPEN_STATUSES.includes(t.status)) return false;
      if (statusFilter !== "open" && statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => (a.planned_date ?? "9999").localeCompare(b.planned_date ?? "9999") || byPriority(a, b));
  const dueToday = tasks.filter(
    (task) => task.deadline === today && task.status !== "completed" && task.status !== "cancelled"
  );
  const overdue = tasks.filter((task) => task.deadline && task.deadline < today && OPEN_STATUSES.includes(task.status));
  const activity = activityOn(today, data);
  const performance = buildPerformance({ ...data, today });

  const scored = (forTasks: GtmTask[]) =>
    forTasks.map((task) => ({
      status: task.status,
      priority: task.priority,
      plannedDate: task.planned_date ?? "",
      blockEnd: task.block ? (blockEnd.get(task.block) ?? null) : null,
    }));
  const todayScore = scoreDay(scored(tasks), today, today, now);
  const weekStart = startOfWeek(today);
  const weekDays = workingDays(weekStart, addDays(weekStart, 4));

  // Prefills from the plan and the pipeline.
  const bookedToday = data.calls.filter((call) => call.status === "booked" && call.scheduled_on === today);
  const leadName = (id: string) => leadOptions.find((lead) => lead.id === id)?.label ?? "a lead";
  const checkIn = {
    objective:
      todayReview?.objective ??
      [week?.theme, openToday.find((task) => task.source === "roadmap" && task.priority === "critical")?.title]
        .filter(Boolean)
        .join(" — ") ??
      "",
    top_tasks: todayReview?.top_tasks?.length
      ? todayReview.top_tasks
      : [...openToday]
          .sort(byPriority)
          .slice(0, 3)
          .map((task) => task.title),
    meetings:
      todayReview?.meetings ??
      (bookedToday.length ? bookedToday.map((call) => `Discovery call: ${leadName(call.lead_id)}`).join("; ") : ""),
    morning_blockers:
      todayReview?.morning_blockers ??
      (data.candidates.some(
        (c) => c.status === "failed" && (c.error_kind === "blocked" || /credit balance/i.test(c.error ?? ""))
      )
        ? "Research blocked: Anthropic credits"
        : ""),
  };
  const tomorrow = nextWorkingDay(addDays(today, 1));
  const tomorrowTop = tasks
    .filter((task) => task.planned_date === tomorrow && OPEN_STATUSES.includes(task.status))
    .sort(byPriority)[0];
  const respondedToday = data.leads.filter((lead) => lead.responded && osloToday(new Date(lead.updated_at)) === today);
  const reviewInitial = {
    completed_summary:
      todayReview?.completed_summary ??
      todayTasks
        .filter((t) => t.status === "completed")
        .map((t) => `• ${t.title}`)
        .join("\n"),
    first_contacts: todayReview?.first_contacts ?? activity.firstContacts,
    follow_ups: todayReview?.follow_ups ?? activity.followUps,
    responses: todayReview?.responses ?? respondedToday.map((lead) => lead.company || lead.name).join(", "),
    calls_booked: todayReview?.calls_booked ?? activity.callsBooked,
    calls_completed: todayReview?.calls_completed ?? activity.callsCompleted,
    obstacles:
      todayReview?.obstacles ??
      todayTasks
        .filter((t) => t.status === "blocked")
        .map((t) => `${t.title}: ${t.status_reason}`)
        .join("; "),
    tomorrow_top: todayReview?.tomorrow_top ?? tomorrowTop?.title ?? "",
  };
  const reviewBlock = schedule.find((block) => block.key === "review");
  const reviewTime = Boolean(reviewBlock && now >= reviewBlock.start);

  // Milestones — progress from evidence only.
  const discoveryEnd = GTM_PHASES[0].end;
  const pilotsEnd = GTM_PHASES[1].end;
  const firstPilotEnd = GTM_PHASES[2].end;
  const callsDone = performance.funnel.find((row) => row.label === "Discovery calls completed")?.value ?? 0;
  const pilotsSigned = performance.funnel.find((row) => row.label === "Deals won")?.value ?? 0;
  const milestoneTasks = (key: GtmTask["milestone"]) =>
    tasks.filter((task) => task.milestone === key && task.status !== "cancelled");
  const milestones = [
    {
      key: "discovery" as const,
      deadline: discoveryEnd,
      target: `${GTM_MILESTONES.discoveryCallsByWeek4}+ discovery calls, and 5 of 15 sharing one problem at 5+ h/week`,
      progress: `${callsDone} of ${GTM_MILESTONES.discoveryCallsByWeek4} calls completed · gate: ${performance.gate.verdict === "met" ? "evidence meets the bar" : performance.gate.verdict === "not_met" ? "not met" : "not enough interviews yet"}`,
      done: callsDone >= GTM_MILESTONES.discoveryCallsByWeek4 && performance.gate.verdict === "met",
      ratio: callsDone / GTM_MILESTONES.discoveryCallsByWeek4,
    },
    {
      key: "pilot_offers" as const,
      deadline: pilotsEnd,
      target: `${GTM_MILESTONES.pilotsByWeek8.min}–${GTM_MILESTONES.pilotsByWeek8.max} signed pilots`,
      progress: `${pilotsSigned} signed`,
      done: pilotsSigned >= GTM_MILESTONES.pilotsByWeek8.min,
      ratio: pilotsSigned / GTM_MILESTONES.pilotsByWeek8.min,
    },
    {
      key: "first_pilot" as const,
      deadline: firstPilotEnd,
      target: "First workflow live, before/after measured, evidence-based case study",
      progress:
        pilotsSigned === 0
          ? "Starts once a pilot is signed"
          : `${milestoneTasks("first_pilot").filter((t) => t.status === "completed").length} of ${milestoneTasks("first_pilot").length} pilot tasks done — confirm "live" and the measurement yourself`,
      // Never claimed automatically: "live" and "measured" aren't in the data.
      done: false,
      ratio: pilotsSigned === 0 ? 0 : 0.2,
    },
  ].map((milestone) => {
    const related = milestoneTasks(milestone.key);
    const blocking = related.filter(
      (task) => (task.status === "missed" || task.status === "blocked") && PRIORITY_ORDER[task.priority] <= 1
    );
    const next = related.filter((task) => OPEN_STATUSES.includes(task.status)).sort(byPriority)[0];
    const daysLeft = daysBetween(today, milestone.deadline);
    const status = milestone.done
      ? "Met"
      : daysLeft < 0
        ? "Deadline passed"
        : blocking.length > 0
          ? "At risk"
          : "In progress";
    return { ...milestone, related, blocking, next, daysLeft, status };
  });

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl">Daily Execution</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {formatDay(today, true)}
            {planDay
              ? ` · Day ${planDay} of ${PLAN_DAYS.length} in the 30-day plan`
              : today < PLAN_START
                ? " · plan starts 19 Oct"
                : today > PLAN_END
                  ? " · 30-day plan finished"
                  : ""}
            {` · ${now} Oslo time`}
          </p>
        </div>
        <Link href="/admin/marketing" className="text-sm font-semibold text-ink-muted hover:text-foreground">
          Marketing →
        </Link>
      </div>

      {runningTask && (
        <div className="mt-6">
          <RunningTaskBar task={runningTask} actions={taskActions} />
        </div>
      )}

      <nav
        className="mt-6 flex max-w-full gap-1 overflow-x-auto rounded-full border border-black/10 bg-black/[0.03] p-1 text-sm [scrollbar-width:none]"
        aria-label="Daily Execution sections"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/execution?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 font-semibold transition",
              tab === t.key ? "bg-background shadow-sm" : "text-ink-muted hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {setupError && (
        <p role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {setupError}
        </p>
      )}

      {tab === "today" && (
        <div className="mt-6 grid gap-6">
          {/* At a glance */}
          <Card>
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Main objective</p>
                <p className="mt-1 text-lg font-semibold">
                  {todayReview?.objective || checkIn.objective || "Keep the pipeline moving"}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${todayTasks.length ? (todayDone / todayTasks.length) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-sm tabular-nums">
                    {todayDone} of {todayTasks.length} done
                  </p>
                </div>
                <p className="mt-2 text-xs text-ink-muted tabular-nums">
                  Time tracked today: {formatDuration(trackedToday)}
                  {estimatedToday > 0 && ` of ${formatDuration(estimatedToday * 60)} planned`}
                  {runningTask && " (timer running)"}
                </p>
                <p className="mt-3 text-sm">
                  {!working ? (
                    <>Weekend — the next working day is {formatDay(nextWorkingDay(today), true)}.</>
                  ) : running ? (
                    <>
                      Now: <span className="font-semibold">{running.label}</span> ({running.start}–{running.end})
                    </>
                  ) : now < dayStart ? (
                    <>The day starts at {dayStart}.</>
                  ) : (
                    <>The working day is over.</>
                  )}
                  {nextTask && working && (
                    <>
                      {" · Next: "}
                      <span className="font-semibold">{nextTask.title}</span>
                    </>
                  )}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                {[
                  ["Researched", activity.researched + activity.approved, targets.research],
                  ["Decision-makers", activity.decisionMakers, targets.decisionMakers],
                  ["Drafted", activity.drafted, targets.drafts],
                  ["Approved", activity.messagesApproved, targets.approvals],
                  ["First messages", activity.firstContacts, targets.firstContacts],
                  ["Follow-ups", activity.followUps, targets.followUps],
                  ["Replies", activity.responses, null],
                  ["Calls booked", activity.callsBooked, null],
                  ["Calls done", activity.callsCompleted, null],
                ].map(([label, value, target]) => (
                  <div key={label as string} className="rounded-xl bg-black/[0.03] p-3">
                    <dt className="text-xs text-ink-muted">{label}</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {value as number}
                      {target != null && (
                        <span className="text-xs font-normal text-ink-muted"> / {target as number}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Counts come from logged messages, research runs and calls — not from ticked tasks.
            </p>
          </Card>

          {working && !todayReview?.checked_in_at && !setupError && (
            <CheckInCard
              day={today}
              initial={checkIn}
              context={[
                {
                  label: "Discovery calls today",
                  items: bookedToday.map((call) => leadName(call.lead_id)),
                },
                {
                  label: "Overdue follow-ups",
                  items: data.leads
                    .filter((lead) => {
                      const due = followUpDate(lead);
                      return Boolean(due && due < today) && !lead.responded;
                    })
                    .map((lead) => lead.company || lead.name),
                },
              ]}
              onSave={saveCheckIn}
            />
          )}

          {(dueToday.length > 0 || overdue.length > 0) && (
            <Card title="Deadlines">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-danger">Overdue ({overdue.length})</p>
                  <TaskList tasks={overdue} actions={taskActions} leads={leadOptions} today={today} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Due today ({dueToday.length})</p>
                  <TaskList tasks={dueToday} actions={taskActions} leads={leadOptions} today={today} />
                </div>
              </div>
            </Card>
          )}

          {/* The planner */}
          <Card title="Today's plan" subtitle={`${dayStart}–${dayEnd} Oslo time · tick tasks off as you go`}>
            {/* Hour-by-hour view of the working day. */}
            <div className="mb-6" aria-label={`Working day ${dayStart} to ${dayEnd}`}>
              <div className="relative flex h-8 overflow-hidden rounded-xl border border-black/10 sm:h-14">
                {schedule.map((block) => (
                  <div
                    key={block.key}
                    title={`${block.start}–${block.end} ${block.label}`}
                    style={{ width: `${(block.minutes / dayMinutes) * 100}%` }}
                    className={cn(
                      "flex flex-col justify-center overflow-hidden border-r border-black/10 px-1.5 last:border-r-0",
                      block.isBreak
                        ? "bg-black/[0.04]"
                        : running?.key === block.key && working
                          ? "bg-accent/15"
                          : "bg-background"
                    )}
                  >
                    {!block.isBreak && (
                      <>
                        <span className="hidden truncate text-[11px] font-semibold leading-tight sm:block">
                          {block.label}
                        </span>
                        <span className="hidden truncate text-[10px] text-ink-muted tabular-nums sm:block">
                          {block.start}–{block.end}
                        </span>
                      </>
                    )}
                  </div>
                ))}
                {working && now >= dayStart && now < dayEnd && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-danger"
                    style={{ left: `${(minutesBetween(dayStart, now) / dayMinutes) * 100}%` }}
                    title={`Now ${now}`}
                  />
                )}
              </div>
              <div className="relative mt-1 h-4 text-[10px] text-ink-muted tabular-nums">
                {hourMarks.map((mark) => (
                  <span
                    key={mark}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${(minutesBetween(dayStart, mark) / dayMinutes) * 100}%` }}
                  >
                    {mark}
                  </span>
                ))}
              </div>
            </div>
            <ol className="grid gap-4">
              {schedule.map((block) => {
                const blockTasks = todayTasks.filter((task) => (task.block ?? "gtm") === block.key).sort(byPriority);
                const times = Object.fromEntries(
                  slotTasks(block, blockTasks).map((slot) => [
                    slot.task.id,
                    { start: slot.start, end: slot.end, overflows: slot.overflows },
                  ])
                );
                const isNow = running?.key === block.key && working;
                if (block.isBreak) {
                  return (
                    <li key={block.key} className="flex gap-4 text-xs text-ink-muted">
                      <span className="w-24 shrink-0 tabular-nums">
                        {block.start}–{block.end}
                      </span>
                      <span>{block.label}</span>
                    </li>
                  );
                }
                return (
                  <li
                    key={block.key}
                    className={cn(
                      "grid gap-2 rounded-xl p-3 sm:grid-cols-[6rem_1fr]",
                      isNow && "bg-accent/5 ring-1 ring-accent/30"
                    )}
                  >
                    <div className="text-sm tabular-nums">
                      <p className="font-semibold">{block.start}</p>
                      <p className="text-xs text-ink-muted">{block.minutes} min</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold">
                        {block.label}
                        {isNow && (
                          <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">Now</span>
                        )}
                      </p>
                      <TaskList
                        tasks={blockTasks}
                        times={times}
                        actions={taskActions}
                        leads={leadOptions}
                        today={today}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4">
              <AddTaskForm today={today} blocks={blocks} leads={leadOptions} onCreate={createTask} />
            </div>
          </Card>

          <Card
            title="End-of-day review"
            subtitle={
              reviewTime
                ? "It's review time — prefilled from today's records."
                : `Opens at ${reviewBlock?.start}. You can fill it in early.`
            }
          >
            {reviewTime || todayReview?.submitted_at ? (
              <DailyReviewForm
                day={today}
                initial={reviewInitial}
                submitted={Boolean(todayReview?.submitted_at)}
                onSave={saveDailyReview}
              />
            ) : (
              <details>
                <summary className="cursor-pointer text-sm font-semibold">Open the review now</summary>
                <div className="mt-3">
                  <DailyReviewForm day={today} initial={reviewInitial} submitted={false} onSave={saveDailyReview} />
                </div>
              </details>
            )}
          </Card>
        </div>
      )}

      {tab === "tasks" && (
        <div className="mt-6 grid gap-6">
          <RescheduleQueue
            tasks={rescheduling}
            today={today}
            onReschedule={rescheduleTask}
            onStatus={updateTaskStatus}
          />
          <Card title={`Tasks (${filteredTasks.length})`}>
            <form method="get" className="mb-4 flex flex-wrap items-end gap-2 text-sm">
              <input type="hidden" name="tab" value="tasks" />
              {[
                { name: "when", value: when, options: WHEN_OPTIONS },
                { name: "status", value: statusFilter, options: STATUS_OPTIONS },
                { name: "priority", value: priorityFilter, options: PRIORITY_OPTIONS },
                { name: "category", value: categoryFilter, options: CATEGORY_OPTIONS },
              ].map((filter) => (
                <label key={filter.name} className="grid gap-1 text-xs text-ink-muted">
                  {filter.name[0].toUpperCase() + filter.name.slice(1)}
                  <select
                    name={filter.name}
                    defaultValue={filter.value}
                    className="h-9 rounded-xl border border-black/10 bg-background px-3 text-sm text-foreground"
                  >
                    {filter.options.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button
                type="submit"
                className="h-9 rounded-full bg-foreground px-4 text-sm font-semibold text-background"
              >
                Filter
              </button>
              <Link href="/admin/execution?tab=tasks" className="h-9 px-2 py-2 text-sm font-semibold text-ink-muted">
                Reset
              </Link>
            </form>
            <TaskList tasks={filteredTasks.slice(0, 100)} actions={taskActions} leads={leadOptions} today={today} />
            {filteredTasks.length > 100 && (
              <p className="mt-2 text-xs text-ink-muted">Showing the first 100 — narrow the filters to see more.</p>
            )}
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Recently completed">
              <ul className="grid gap-1 text-sm">
                {tasks
                  .filter((t) => t.status === "completed")
                  .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
                  .slice(0, 25)
                  .map((t) => (
                    <li key={t.id} className="flex justify-between gap-3">
                      <span>{t.title}</span>
                      <span className="shrink-0 text-xs text-ink-muted">
                        {t.completed_at ? formatDay(osloToday(new Date(t.completed_at))) : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
            <Card title="Missed deadlines">
              <ul className="grid gap-1 text-sm">
                {tasks
                  .filter(
                    (t) => t.deadline && t.deadline < today && t.status !== "completed" && t.status !== "cancelled"
                  )
                  .map((t) => (
                    <li key={t.id} className="flex justify-between gap-3">
                      <span>{t.title}</span>
                      <span className="shrink-0 text-xs text-danger">{formatDay(t.deadline as string)}</span>
                    </li>
                  ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "roadmap" && (
        <div className="mt-6 grid gap-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {milestones.map((m) => (
              <Card key={m.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-semibold">{milestoneLabels[m.key]}</h2>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      m.status === "Met"
                        ? statusTone.on_track
                        : m.status === "At risk" || m.status === "Deadline passed"
                          ? statusTone.behind
                          : statusTone.not_started
                    )}
                  >
                    {m.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Deadline {formatDay(m.deadline)} ·{" "}
                  {m.daysLeft >= 0 ? `${m.daysLeft} days left` : `${-m.daysLeft} days ago`}
                </p>
                <p className="mt-3 text-sm">{m.target}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${Math.min(100, m.ratio * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-medium">{m.progress}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {m.related.filter((t) => t.status === "completed").length} of {m.related.length} related tasks done
                  {m.blocking.length > 0 && <span className="text-danger"> · {m.blocking.length} blocking</span>}
                </p>
                {m.next && <p className="mt-1 text-xs">Next: {m.next.title}</p>}
              </Card>
            ))}
          </div>
          {ROADMAP_WEEKS.map((w, index) => {
            const weekTasks = tasks.filter(
              (t) => t.source === "roadmap" && (t.planned_date ?? "") >= w.start && (t.planned_date ?? "") <= w.end
            );
            const isCurrent = today >= w.start && today <= w.end;
            return (
              <Card key={w.start} className={cn(isCurrent && "ring-1 ring-foreground/20")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">
                    {index < 4 ? `Week ${index + 1}` : "Days 21–22"}: {w.theme}
                  </h2>
                  <p className="text-xs text-ink-muted">
                    {formatDay(w.start)} – {formatDay(w.end)} ·{" "}
                    {weekTasks.filter((t) => t.status === "completed").length}/{weekTasks.length} done
                  </p>
                </div>
                {weekTasks.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">
                    {w.start >= "2026-11-16"
                      ? "Generated after the week-4 gate on 9 November, from its results."
                      : "Not generated yet."}
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-1 text-sm">
                    {weekTasks.map((t) => (
                      <li key={t.id} className="flex flex-wrap justify-between gap-2">
                        <span className={cn(t.status === "completed" && "text-ink-muted line-through")}>
                          {formatDay(t.planned_date as string)} · {t.title}
                        </span>
                        <span className={cn("text-xs", t.status === "missed" ? "text-danger" : "text-ink-muted")}>
                          {taskStatusLabels[t.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === "calendar" && (
        <Card
          className="mt-6"
          title="Three weeks"
          subtitle="Tasks, discovery calls, follow-ups and milestones. Move a task with its date field — its history is kept."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {workingDays(weekStart, addDays(weekStart, 18)).map((date) => {
              const dayTasks = tasks.filter((t) => t.planned_date === date && t.status !== "cancelled");
              const dayCalls = data.calls.filter((c) => c.status !== "cancelled" && c.scheduled_on === date);
              const dayFollowUps = data.leads.filter((lead) => followUpDate(lead) === date);
              const dayMilestones = milestones.filter((m) => m.deadline === date);
              return (
                <div
                  key={date}
                  className={cn(
                    "min-h-32 rounded-xl border bg-background p-2",
                    date === today ? "border-foreground" : "border-black/10"
                  )}
                >
                  <p className={cn("text-xs font-semibold", date < today && "text-ink-muted")}>{formatDay(date)}</p>
                  <ul className="mt-1 grid gap-1 text-xs">
                    {dayMilestones.map((m) => (
                      <li key={m.key} className="rounded bg-foreground px-1.5 py-0.5 font-semibold text-background">
                        Milestone: {milestoneLabels[m.key]}
                      </li>
                    ))}
                    {dayCalls.map((c) => (
                      <li key={c.id} className="rounded bg-[#E3F3E6] px-1.5 py-0.5 text-[#1B8A3A]">
                        Call: {leadName(c.lead_id)}
                      </li>
                    ))}
                    {dayFollowUps.map((lead) => (
                      <li key={lead.id} className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">
                        Follow up: {lead.company || lead.name}
                      </li>
                    ))}
                    {dayTasks.map((t) => (
                      <li key={t.id} className="grid gap-0.5">
                        <span
                          className={cn(
                            t.status === "completed" && "text-ink-muted line-through",
                            t.status === "missed" && "text-danger"
                          )}
                        >
                          {t.title}
                        </span>
                        {t.status !== "completed" && (
                          <MoveTask taskId={t.id} date={date} onReschedule={rescheduleTask} />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === "scorecard" && (
        <div className="mt-6 grid gap-6">
          <Card
            title="Today's execution"
            subtitle="Execution rate = completed tasks ÷ tasks due so far × 100. A task is due once its time block has ended."
          >
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-3xl font-semibold tabular-nums">
                {todayScore.rate === null ? "—" : `${todayScore.rate}%`}
              </p>
              <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", statusTone[todayScore.status])}>
                {statusText[todayScore.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              {todayScore.due} due · {todayScore.completed} completed · {todayScore.missed} missed ·{" "}
              {todayScore.blocked} blocked · important (critical/high): {todayScore.importantDone}/
              {todayScore.importantDue}
              {todayScore.criticalMissed > 0 && ` · ${todayScore.criticalMissed} critical task(s) not done`}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              On track = 80%+ and no critical task undone. Needs attention = 50%+ (or half the important tasks).
              Otherwise behind plan.
            </p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold">Which tasks make up today&apos;s rate</summary>
              <ul className="mt-2 grid gap-1">
                {todayTasks.map((t) => {
                  const end = t.block ? blockEnd.get(t.block) : null;
                  const counted = t.status === "completed" || (end != null && end <= now);
                  return (
                    <li key={t.id} className="flex flex-wrap justify-between gap-2">
                      <span className={cn(!counted && "text-ink-muted")}>{t.title}</span>
                      <span className="text-xs text-ink-muted">
                        {taskStatusLabels[t.status]} · {counted ? "counted" : `not due yet (block ends ${end ?? "—"})`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Sales activity today" subtitle="What you did — from logged records.">
              <dl className="grid gap-1 text-sm">
                {[
                  ["First contacts sent", activity.firstContacts],
                  ["Follow-ups sent", activity.followUps],
                  ["Companies researched", activity.researched],
                  ["Leads approved", activity.approved],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between gap-3">
                    <dt>{label}</dt>
                    <dd className="font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Sales outcomes today" subtitle="What the market did back. Ticked tasks aren't customers.">
              <dl className="grid gap-1 text-sm">
                {[
                  ["Replies received", activity.responses],
                  ["Discovery calls booked", activity.callsBooked],
                  ["Discovery calls completed", activity.callsCompleted],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between gap-3">
                    <dt>{label}</dt>
                    <dd className="font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          <Card
            title="This week"
            subtitle={`Monday ${formatDay(weekStart)} – Friday ${formatDay(addDays(weekStart, 4))}`}
          >
            <div className="grid gap-2 sm:grid-cols-5">
              {weekDays.map((date) => {
                const s = scoreDay(scored(tasks), date, today, now);
                return (
                  <div key={date} className="rounded-xl bg-black/[0.03] p-3 text-sm">
                    <p className="text-xs text-ink-muted">{formatDay(date)}</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {date > today ? "—" : s.rate === null ? "—" : `${s.rate}%`}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {s.completed}/{s.due} done
                    </p>
                  </div>
                );
              })}
            </div>
            {(() => {
              const sum = (key: keyof ReturnType<typeof activityOn>) =>
                weekDays.reduce((total, date) => total + activityOn(date, data)[key], 0);
              const weekTasksAll = tasks.filter(
                (t) =>
                  (t.planned_date ?? "") >= weekStart &&
                  (t.planned_date ?? "") <= addDays(weekStart, 4) &&
                  t.status !== "cancelled"
              );
              const weekDue = weekTasksAll.filter((t) => (t.planned_date ?? "") < today || t.status === "completed");
              const posts = tasks.filter(
                (t) =>
                  t.category === "linkedin" &&
                  t.source === "roadmap" &&
                  t.status === "completed" &&
                  (t.planned_date ?? "") >= weekStart &&
                  (t.planned_date ?? "") <= addDays(weekStart, 4)
              ).length;
              const blockers = [
                ...reviews.filter((r) => r.day >= weekStart && r.obstacles).map((r) => r.obstacles as string),
                ...weekTasksAll.filter((t) => t.status === "blocked").map((t) => `${t.title}: ${t.status_reason}`),
              ];
              const rows: [string, [string, string | number][]][] = [
                [
                  "Activity",
                  [
                    ["Companies researched", `${sum("researched")} / ${WEEKLY_TARGETS.researched}`],
                    ["Leads approved", `${sum("approved")} / ${WEEKLY_TARGETS.approved}`],
                    ["First contacts", `${sum("firstContacts")} / ${WEEKLY_TARGETS.contacts}`],
                    ["Follow-ups", sum("followUps")],
                    ["LinkedIn posts published", posts],
                  ],
                ],
                [
                  "Results",
                  [
                    ["Responses", sum("responses")],
                    ["Calls booked", sum("callsBooked")],
                    [
                      "Calls completed",
                      `${sum("callsCompleted")} / ${WEEKLY_TARGETS.discoveryCalls.min}–${WEEKLY_TARGETS.discoveryCalls.max}`,
                    ],
                    [
                      "Qualified opportunities (all time)",
                      performance.funnel.find((r) => r.label === "Qualified opportunities")?.value ?? 0,
                    ],
                    [
                      "Proposals sent (all time)",
                      performance.funnel.find((r) => r.label === "Proposals sent")?.value ?? 0,
                    ],
                    ["Pilots signed (all time)", pilotsSigned],
                  ],
                ],
                [
                  "Execution",
                  [
                    ["Tasks planned", weekTasksAll.length],
                    ["Tasks completed", weekTasksAll.filter((t) => t.status === "completed").length],
                    [
                      "Execution rate",
                      weekDue.length
                        ? `${Math.round((weekDue.filter((t) => t.status === "completed").length / weekDue.length) * 100)}%`
                        : "—",
                    ],
                    ["Overdue tasks", rescheduling.length],
                    ["Blocked tasks", weekTasksAll.filter((t) => t.status === "blocked").length],
                    [
                      "Time tracked",
                      formatDuration(weekTasksAll.reduce((sum, t) => sum + trackedSeconds(t, loadedAt), 0)),
                    ],
                  ],
                ],
              ];
              return (
                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  {rows.map(([title, items]) => (
                    <div key={title}>
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{title}</p>
                      <dl className="mt-2 grid gap-1 text-sm">
                        {items.map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3">
                            <dt>{label}</dt>
                            <dd className="font-semibold tabular-nums">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                  {blockers.length > 0 && (
                    <div className="md:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Main blockers</p>
                      <ul className="mt-1 list-disc pl-5 text-sm">
                        {blockers.slice(0, 6).map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>

          <Card
            title="Weekly review"
            subtitle={
              new Date(`${today}T00:00:00Z`).getUTCDay() === 5
                ? "It's Friday — record this week's decisions."
                : "Due on Friday; you can start any time."
            }
          >
            <WeeklyReviewForm
              weekStart={weekStart}
              reviewDay={addDays(weekStart, 4)}
              initial={{
                what_worked: weeklyReview?.what_worked ?? "",
                what_didnt: weeklyReview?.what_didnt ?? "",
                best_industry: weeklyReview?.best_industry ?? "",
                best_message: weeklyReview?.best_message ?? "",
                change_next_week: weeklyReview?.change_next_week ?? "",
              }}
              onSave={saveWeeklyReview}
            />
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <Card
          className="mt-6"
          title="Working schedule"
          subtitle="Block lengths set the planner's times. Breaks aren't counted as work."
        >
          <PlannerSettingsForm dayStart={dayStart} blocks={blocks} targets={targets} onSave={savePlannerSettings} />
        </Card>
      )}
    </section>
  );
}
