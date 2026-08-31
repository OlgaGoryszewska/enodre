import Link from "next/link";
import { ArrowUpRight, Briefcase, Handshake } from "lucide-react";
import type { JobLead } from "@/lib/job-lead";

interface RecentJobsWidgetProps {
  linkedinJobs: JobLead[];
  upworkJobs: JobLead[];
}

type SourcedJob = JobLead & { source: "linkedin" | "upwork" };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Read-only recap, server-rendered — no interactivity needed here, editing
// still happens on the LinkedIn/Upwork pages themselves.
export function RecentJobsWidget({ linkedinJobs, upworkJobs }: RecentJobsWidgetProps) {
  const jobs: SourcedJob[] = [
    ...linkedinJobs.map((job) => ({ ...job, source: "linkedin" as const })),
    ...upworkJobs.map((job) => ({ ...job, source: "upwork" as const })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">New job leads</h2>
          <p className="mt-1 text-sm text-ink-muted">Added in the last 7 days</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">Nothing new this week.</p>
      ) : (
        <ul className="mt-5 grid gap-2">
          {jobs.map((job) => {
            const SourceIcon = job.source === "linkedin" ? Briefcase : Handshake;
            return (
              <li
                key={`${job.source}-${job.id}`}
                className="flex items-center gap-3 rounded-xl border border-black/10 bg-background p-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"
                  aria-hidden="true"
                >
                  <SourceIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1"
                  >
                    <span className="truncate text-sm font-medium transition group-hover:text-accent">
                      {job.title}
                    </span>
                    <ArrowUpRight
                      className="h-3 w-3 shrink-0 text-ink-muted transition group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </a>
                  {job.company && <p className="truncate text-xs text-ink-muted">{job.company}</p>}
                </div>
                <span className="shrink-0 text-xs text-ink-muted">{formatDate(job.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex gap-4 text-sm font-semibold text-accent">
        <Link href="/admin/linkedin" className="hover:opacity-80">
          LinkedIn →
        </Link>
        <Link href="/admin/upwork" className="hover:opacity-80">
          Upwork →
        </Link>
      </div>
    </div>
  );
}
