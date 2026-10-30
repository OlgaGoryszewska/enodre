import { ExternalLink, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { GtmTasksButton } from "@/components/admin/GtmTasksButton";
import type { MarketingTask } from "@/lib/marketing-task";
import {
  GTM_PHASES,
  GTM_PLAN_URL,
  GTM_SUMMARY,
  GTM_TASKS,
  GTM_TASK_PREFIX,
  GTM_WEEKLY_TARGETS,
  currentPhaseIndex,
  currentPlanWeek,
} from "@/lib/gtm-plan";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

interface GtmPlanCardProps {
  marketingTasks: MarketingTask[];
  onAddTasks: () => Promise<{ added: number }>;
}

export function GtmPlanCard({ marketingTasks, onAddTasks }: GtmPlanCardProps) {
  // Oslo is where the plan runs; the server's own clock may be UTC.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });
  const phaseIndex = currentPhaseIndex(today);
  const week = currentPlanWeek(today);
  const gtmTitles = new Set(GTM_TASKS.map((task) => `${GTM_TASK_PREFIX}${task.title}`));
  const gtmTasks = marketingTasks.filter((task) => gtmTitles.has(task.title));
  const doneCount = gtmTasks.filter((task) => task.status === "done").length;

  return (
    <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">GTM plan</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {week
              ? `Week ${week} of 12 · ${GTM_PHASES[phaseIndex]?.name ?? ""}`
              : phaseIndex < 0
                ? `Starts ${formatDay(GTM_PHASES[0].start)}`
                : "90-day plan finished — time for the next one"}
          </p>
        </div>
        <a
          href={GTM_PLAN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
        >
          Open full plan <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">What we sell</dt>
          <dd className="mt-1">{GTM_SUMMARY.product}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">To whom</dt>
          <dd className="mt-1">{GTM_SUMMARY.customers}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">90-day goal</dt>
          <dd className="mt-1">{GTM_SUMMARY.goal}</dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Partner track</dt>
          <dd className="mt-1">{GTM_SUMMARY.partners}</dd>
        </div>
      </dl>

      <ol className="mt-6 grid gap-3 lg:grid-cols-3">
        {GTM_PHASES.map((phase, index) => {
          const isCurrent = index === phaseIndex;
          const isDone = index < phaseIndex;
          return (
            <li
              key={phase.name}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex flex-col rounded-xl border p-4",
                isCurrent ? "border-foreground bg-background" : "border-black/10 bg-background",
                isDone && "opacity-60"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {index + 1} · {phase.name}
                </p>
                {isCurrent && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
                    Now
                  </span>
                )}
                {isDone && <span className="text-xs text-ink-muted">Done</span>}
              </div>
              <p className="text-xs text-ink-muted">
                {phase.weeks} · {formatDay(phase.start)}–{formatDay(phase.end)}
              </p>
              <ul className="mt-3 grid gap-1 text-sm">
                {phase.work.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-auto flex items-start gap-1.5 border-t border-black/10 pt-3 text-xs">
                <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                <span>
                  <span className="font-semibold">Gate:</span> {phase.gate}
                </span>
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 grid gap-3 rounded-xl border border-black/10 bg-background p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">To-do list</p>
          {gtmTasks.length > 0 && (
            <p className="text-sm text-ink-muted">
              {doneCount} of {GTM_TASKS.length} done · tracked on the Marketing board below
            </p>
          )}
        </div>
        {gtmTasks.length > 0 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${(doneCount / GTM_TASKS.length) * 100}%` }}
            />
          </div>
        )}
        <GtmTasksButton onAdd={onAddTasks} allAdded={gtmTasks.length >= GTM_TASKS.length} />
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Every week</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {GTM_WEEKLY_TARGETS.map((target) => (
            <li key={target.label} className="rounded-full border border-black/10 bg-background px-3 py-1.5 text-sm">
              {target.label}: <span className="font-semibold">{target.target}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
