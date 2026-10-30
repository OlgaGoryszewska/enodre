import Link from "next/link";
import { Bot } from "lucide-react";
import type { JobAgentStats } from "@/lib/job-agent";

export type JobAgentReportRun = {
  created_at: string;
  trigger: string;
  stats: Partial<JobAgentStats> | null;
  report: string | null;
};

/** The job agent's latest report, on the main dashboard. */
export function JobAgentReportCard({ run }: { run: JobAgentReportRun | null }) {
  const stats = run?.stats ?? {};
  const figures = [
    { label: "New matches", value: stats.saved ?? 0 },
    { label: "Applied by email", value: stats.emailed?.length ?? 0 },
    { label: "Open applications", value: stats.openApplications?.length ?? 0 },
  ];
  const problems = stats.problems ?? [];

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Bot className="h-5 w-5 text-accent" aria-hidden="true" /> Job agent report
        </h2>
        <Link href="/admin/linkedin" className="text-sm font-semibold text-ink-muted hover:text-foreground">
          Open Find jobs →
        </Link>
      </div>

      {!run ? (
        <p className="mt-3 text-sm text-ink-muted">
          No run yet. It runs every morning at about 06:00, or click Run now on Find jobs.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-muted">
            {new Date(run.created_at).toLocaleString("en-GB", { timeZone: "Europe/Oslo" })} ·{" "}
            {run.trigger === "cron" ? "daily run" : "run by hand"}
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {figures.map((figure) => (
              <div key={figure.label} className="rounded-xl bg-black/[0.03] p-3">
                <dt className="text-xs text-ink-muted">{figure.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{figure.value}</dd>
              </div>
            ))}
          </dl>
          {problems.length > 0 && (
            <ul className="mt-4 grid gap-1 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
          {run.report && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">Full report</summary>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-black/[0.03] p-4 text-xs leading-5">
                {run.report}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
