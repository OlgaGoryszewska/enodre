"use client";

import { useState, useTransition } from "react";
import { Bot, Check, Copy, ExternalLink, FileUp, Loader2, RotateCcw, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TARGET_CITIES } from "@/lib/job-matching";

export type JobPosting = {
  id: string;
  title: string;
  company: string | null;
  city: string | null;
  location: string | null;
  url: string;
  source: string;
  score: number;
  matched: string[];
  cover_letter: string | null;
  status: "new" | "applied" | "dismissed" | "interview" | "rejected";
  applied_via: string | null;
  published_at: string | null;
  applied_at: string | null;
  created_at: string;
};

// Dates in Norway time, so "today" matches the morning run.
const osloDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Oslo" });

function dayLabel(day: string) {
  const today = osloDay(new Date().toISOString());
  const yesterday = osloDay(new Date(Date.now() - 86_400_000).toISOString());
  const date = new Date(`${day}T12:00:00Z`);
  const short = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (day === today) return `Today · ${short}`;
  if (day === yesterday) return `Yesterday · ${short}`;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Jobs grouped by the day they were fetched, newest day first (best match first within a day). */
function byFetchDay(jobs: JobPosting[]) {
  const groups = new Map<string, JobPosting[]>();
  for (const job of jobs) {
    const day = osloDay(job.created_at);
    groups.set(day, [...(groups.get(day) ?? []), job]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, list]) => [day, [...list].sort((x, y) => y.score - x.score)] as const);
}

export type JobAgentRun = { created_at: string; trigger: string; report: string | null };

const STATUS_LABELS: Record<JobPosting["status"], string> = {
  new: "New",
  applied: "Applied",
  dismissed: "Dismissed",
  interview: "Interview",
  rejected: "Rejected",
};

/** The job agent: what it found this morning, one click to apply, and its report. */
export function JobAgentPanel({
  postings,
  lastRun,
  cvUploaded,
  openApplicationsSent,
  setupMissing,
  onRunNow,
  onSetStatus,
  onUploadCv,
}: {
  postings: JobPosting[];
  lastRun: JobAgentRun | null;
  cvUploaded: boolean;
  openApplicationsSent: number;
  setupMissing: boolean;
  onRunNow: () => Promise<{ saved: number; emailed: number; openApplications: number }>;
  onSetStatus: (id: string, status: JobPosting["status"]) => Promise<void>;
  onUploadCv: (formData: FormData) => Promise<void>;
}) {
  const [city, setCity] = useState<string>("all");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openLetter, setOpenLetter] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showReport, setShowReport] = useState(true);

  if (setupMissing) {
    return (
      <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">Job agent</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Run supabase/job_agent.sql in the Supabase SQL Editor to switch it on.
        </p>
      </div>
    );
  }

  const fresh = postings.filter(
    (job) =>
      job.status === "new" && (city === "all" || (job.city ?? (job.source === "finn" ? "FINN" : "LinkedIn")) === city)
  );
  const applied = postings.filter((job) => job.status === "applied" || job.status === "interview");

  async function run() {
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onRunNow();
      setMessage(
        `${result.saved} new matches · ${result.emailed} applied by email · ${result.openApplications} open applications. The report is in your inbox.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "The run failed.");
    } finally {
      setRunning(false);
    }
  }

  function setStatus(id: string, status: JobPosting["status"]) {
    startTransition(async () => {
      try {
        await onSetStatus(id, status);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Bot className="h-5 w-5 text-accent" aria-hidden="true" /> Job agent
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Every morning: new developer/UX ads in Oslo, Warsaw, Colombo, Dubai, Riyadh, Spain and remote, scored
            against your CV (up to 50 a day), each with a cover letter. It emails your CV where an ad asks for that,
            sends open applications to Oslo agencies from olga.goryszewska@gmail.com, and emails you a report.
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            {lastRun
              ? `Last run ${new Date(lastRun.created_at).toLocaleString("en-GB")} (${lastRun.trigger})`
              : "Not run yet"}{" "}
            · {openApplicationsSent} open applications sent so far
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form
            action={(formData) =>
              startTransition(async () => {
                setError(null);
                try {
                  await onUploadCv(formData);
                  setMessage("CV uploaded.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload failed.");
                }
              })
            }
            className="flex items-center gap-2"
          >
            <label className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer px-4 py-2 text-sm")}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {cvUploaded ? "Replace CV" : "Upload CV (PDF)"}
              <input
                type="file"
                name="cv"
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
              />
            </label>
          </form>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Bot className="h-4 w-4" aria-hidden="true" />
            )}
            {running ? "Running — a few minutes…" : "Run now"}
          </button>
        </div>
      </div>

      {!cvUploaded && (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          Upload your CV — until then the agent finds and scores jobs but sends no applications.
        </p>
      )}
      {message && <p className="mt-4 text-sm text-ink-muted">{message}</p>}
      {error && <p className="mt-4 text-sm font-semibold text-danger">{error}</p>}

      {lastRun?.report && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowReport((current) => !current)}
            className="text-sm font-semibold text-ink-muted hover:text-foreground"
          >
            {showReport ? "Hide" : "Show"} the last report
          </button>
          {showReport && (
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-black/[0.03] p-4 text-xs leading-5">
              {lastRun.report}
            </pre>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-1.5">
        {["all", ...TARGET_CITIES, "LinkedIn", "FINN"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCity(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              city === value
                ? "border-foreground bg-foreground text-background"
                : "border-black/10 hover:border-black/30"
            )}
          >
            {value === "all" ? `All (${postings.filter((job) => job.status === "new").length})` : value}
          </button>
        ))}
      </div>

      {fresh.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
          No new matches here. The agent runs every morning.
        </p>
      ) : (
        <div className="mt-4 grid gap-6">
          {byFetchDay(fresh).map(([day, jobs]) => (
            <section key={day}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {dayLabel(day)} · {jobs.length} job{jobs.length === 1 ? "" : "s"}
              </h3>
              <ul className="grid gap-2">
                {jobs.map((job) => (
                  <li key={job.id} className="rounded-xl border border-black/10 bg-background p-3 text-sm">
                    <div className="flex flex-wrap items-start gap-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          job.score >= 60 ? "bg-[#E3F3E6] text-[#1B8A3A]" : "bg-black/5 text-ink-muted"
                        )}
                        title="Fit with your CV, 0–100"
                      >
                        {job.score}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{job.title}</p>
                        <p className="text-xs text-ink-muted">
                          {[
                            job.company,
                            job.location,
                            job.source,
                            job.matched.slice(0, 5).join(", "),
                            `found ${shortDate(job.created_at)}`,
                            job.published_at && `posted ${shortDate(job.published_at)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-3 py-1.5 text-xs")}
                        >
                          Apply <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setOpenLetter((current) => (current === job.id ? null : job.id))}
                          className="text-xs font-semibold text-ink-muted hover:text-foreground"
                        >
                          Cover letter
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setStatus(job.id, "applied")}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-foreground"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Applied
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setStatus(job.id, "dismissed")}
                          aria-label="Dismiss"
                          className="rounded-full p-1 text-ink-muted hover:text-danger"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {openLetter === job.id && job.cover_letter && (
                      <div className="mt-3 grid gap-2 rounded-lg bg-black/[0.03] p-3">
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-5">{job.cover_letter}</pre>
                        <button
                          type="button"
                          onClick={() =>
                            void navigator.clipboard
                              .writeText(job.cover_letter ?? "")
                              .then(() => setCopied(job.id))
                              .catch(() => undefined)
                          }
                          className="inline-flex items-center gap-1 justify-self-start text-xs font-semibold hover:underline"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" /> {copied === job.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {applied.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer font-semibold">Applied ({applied.length})</summary>
          <ul className="mt-2 grid gap-1.5">
            {applied.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium">{job.title}</span>
                <span className="text-ink-muted">
                  {[
                    job.company,
                    job.city,
                    job.applied_at && `applied ${shortDate(job.applied_at)}`,
                    job.applied_via === "email" ? "sent by the agent" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <select
                  value={job.status}
                  onChange={(event) => setStatus(job.id, event.target.value as JobPosting["status"])}
                  className="rounded-full border border-black/10 bg-background px-2 py-0.5"
                >
                  {(["applied", "interview", "rejected"] as const).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                {job.applied_via !== "email" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(job.id, "new")}
                    title="Not applied after all — back to the list"
                    className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
