import { cn } from "@/lib/utils";
import type { buildPerformance } from "@/lib/gtm-dashboard";
import { GATE_COMPANIES_NEEDED, GATE_HOURS_THRESHOLD, GATE_INTERVIEW_TARGET } from "@/lib/gtm-logic";
import { problemCategoryLabels, type ProblemCategory } from "@/lib/discovery-call";
import { accountingSystemLabels, type AccountingSystem } from "@/lib/potential-customer";

type Performance = ReturnType<typeof buildPerformance>;

function formatDay(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function Bar({ value, target }: { value: number; target: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
      <div
        className="h-full rounded-full bg-foreground"
        style={{ width: `${Math.min(100, (value / target) * 100)}%` }}
      />
    </div>
  );
}

/** GTM performance, this week's activity and the week-4 gate — all from real records. */
export function GtmPerformance({ performance }: { performance: Performance }) {
  const { funnel, revenueNok, weekly, weekStart, gate, systems } = performance;

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">GTM performance</h2>
        <p className="mt-1 text-sm text-ink-muted">
          All time. Only real events count — a draft isn&apos;t a sent message, a booked call isn&apos;t a held one. The
          percentage is the conversion from the stage above.
        </p>
        <dl className="mt-5 grid gap-1">
          {funnel.map((row, index) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_auto_3.5rem] items-baseline gap-3 border-b border-black/5 py-1.5 text-sm last:border-0"
            >
              <dt>
                {row.label}
                {"hint" in row && row.hint && <span className="block text-xs text-ink-muted">{row.hint}</span>}
              </dt>
              <dd className="text-right font-semibold tabular-nums">
                {row.value}
                {"target" in row && row.target != null && (
                  <span className="ml-1 text-xs font-normal text-ink-muted">
                    of {row.target} {row.targetLabel}
                  </span>
                )}
              </dd>
              <dd className="text-right text-xs text-ink-muted tabular-nums">
                {index > 0 && funnel[index - 1].value > 0
                  ? `${Math.round((row.value / funnel[index - 1].value) * 100)}%`
                  : ""}
              </dd>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto_3.5rem] items-baseline gap-3 pt-2 text-sm">
            <dt className="font-semibold">Revenue</dt>
            <dd className="text-right font-semibold tabular-nums">
              {revenueNok.toLocaleString("nb-NO", { maximumFractionDigits: 0 })} NOK
            </dd>
            <dd />
          </div>
          <p className="text-xs text-ink-muted">
            From the deal value on won leads (set it in the lead&apos;s Details).
          </p>
        </dl>
      </div>

      <div className="grid content-start gap-6">
        <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">This week</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Since Monday {formatDay(weekStart)}, against the plan&apos;s weekly targets.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {weekly.map((row) => (
              <div key={row.label}>
                <p className="text-sm">{row.label}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {row.value}
                  <span className="ml-1 text-sm font-normal text-ink-muted">/ {row.targetLabel ?? row.target}</span>
                </p>
                <Bar value={row.value} target={row.target} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Week-4 gate</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Do {GATE_COMPANIES_NEEDED}+ of {GATE_INTERVIEW_TARGET} interviewed companies share one problem at{" "}
            {GATE_HOURS_THRESHOLD}+ hours a week? Completed calls only.
          </p>
          <p
            className={cn(
              "mt-4 rounded-xl px-4 py-3 text-sm font-semibold",
              gate.verdict === "met" ? "bg-[#E3F3E6] text-[#1B8A3A]" : "bg-black/[0.04]"
            )}
          >
            {gate.verdict === "met"
              ? `Evidence meets the bar: ${gate.topProblem?.meetsHours} companies report “${problemCategoryLabels[gate.topProblem?.problem as ProblemCategory] ?? gate.topProblem?.problem}” at ${GATE_HOURS_THRESHOLD}+ h/week. The decision is yours.`
              : gate.verdict === "not_enough_interviews"
                ? `Not enough evidence yet: ${gate.interviewed} of ${GATE_INTERVIEW_TARGET} interviews completed.`
                : `${gate.interviewed} interviews done, but no single problem reaches ${GATE_COMPANIES_NEEDED} companies at ${GATE_HOURS_THRESHOLD}+ h/week. Consider switching the workflow — your call.`}
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-ink-muted">Interviewed</dt>
              <dd className="text-xl font-semibold tabular-nums">{gate.interviewed}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{GATE_HOURS_THRESHOLD}+ h/week</dt>
              <dd className="text-xl font-semibold tabular-nums">{gate.meetsHoursCount}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Pilot interest</dt>
              <dd className="text-xl font-semibold tabular-nums">{gate.pilotInterested}</dd>
            </div>
          </dl>
          {gate.problems.length > 0 && (
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-ink-muted">
                  <th className="py-1 font-medium">Problem</th>
                  <th className="py-1 text-right font-medium">Reported</th>
                  <th className="py-1 text-right font-medium">At {GATE_HOURS_THRESHOLD}+ h</th>
                </tr>
              </thead>
              <tbody>
                {gate.problems.map((row) => (
                  <tr key={row.problem} className="border-t border-black/5">
                    <td className="py-1.5">{problemCategoryLabels[row.problem as ProblemCategory] ?? row.problem}</td>
                    <td className="py-1.5 text-right tabular-nums">{row.reported}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{row.meetsHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {systems.length > 0 && (
            <p className="mt-3 text-xs text-ink-muted">
              Accounting systems:{" "}
              {systems
                .map(([system, count]) => `${accountingSystemLabels[system as AccountingSystem] ?? system} (${count})`)
                .join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
