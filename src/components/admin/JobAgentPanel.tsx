"use client";

import { useState, useTransition } from "react";
import { Bot, Check, Copy, ExternalLink, Eye, FileUp, Loader2, RotateCcw, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TARGET_CITIES } from "@/lib/job-matching";
import type { JobAgentPreview } from "@/lib/job-agent";

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

export type JobAgentRun = {
  id: string;
  created_at: string;
  trigger: string;
  stats: { saved?: number; emailed?: unknown[]; openApplications?: unknown[]; cleared?: number } | null;
  report: string | null;
};

export type PreviewResult = {
  stats: { found: number; matched: number; cleared: number; problems: string[] };
  report: string;
  preview: JobAgentPreview;
};

export type SentApplication = {
  id: string;
  created_at: string;
  kind: "ad" | "open";
  company: string | null;
  to_email: string;
  subject: string;
  body: string;
  attachment: string | null;
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  });

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
  runs,
  sentApplications,
  cvUploaded,
  openApplicationsSent,
  setupMissing,
  onRunNow,
  onPreview,
  onSetStatus,
  onUploadCv,
}: {
  postings: JobPosting[];
  runs: JobAgentRun[];
  sentApplications: SentApplication[];
  cvUploaded: boolean;
  openApplicationsSent: number;
  setupMissing: boolean;
  onRunNow: () => Promise<{ saved: number; emailed: number; openApplications: number }>;
  onPreview: () => Promise<PreviewResult>;
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
  const lastRun = runs[0] ?? null;
  const [openReport, setOpenReport] = useState<string | null>(runs[0]?.id ?? null);
  const [openSent, setOpenSent] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewLetter, setPreviewLetter] = useState<number | null>(null);
  const [confirmRun, setConfirmRun] = useState(false);

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

  async function runPreview() {
    setPreviewing(true);
    setError(null);
    setMessage(null);
    try {
      setPreviewResult(await onPreview());
    } catch (err) {
      setError(err instanceof Error ? err.message : "The preview failed.");
    } finally {
      setPreviewing(false);
    }
  }

  async function run(confirmed = false) {
    if (
      !confirmed &&
      !window.confirm("Run the agent now? It sends the applications it finds. Use Preview to see them first.")
    )
      return;
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
            onClick={() => void runPreview()}
            disabled={running || previewing}
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
          >
            {previewing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {previewing ? "Searching — a few minutes…" : "Preview (sends nothing)"}
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || previewing}
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

      {previewResult && (
        <div className="mt-4 grid gap-4 rounded-xl border border-foreground/20 bg-background p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Preview — nothing was saved or sent</p>
              <p className="text-xs text-ink-muted">
                {previewResult.stats.found} ads found · {previewResult.stats.matched} fit your CV ·{" "}
                {previewResult.preview.jobs.length} would be added · {previewResult.preview.applications.length}{" "}
                application{previewResult.preview.applications.length === 1 ? "" : "s"} would be sent
                {previewResult.stats.cleared ? ` · ${previewResult.stats.cleared} would be cleared` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!confirmRun ? (
                <button
                  type="button"
                  onClick={() => setConfirmRun(true)}
                  disabled={running}
                  className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-3 py-1.5 text-xs")}
                >
                  Run and send
                </button>
              ) : (
                <>
                  <span className="text-xs font-semibold">Send these applications now?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRun(false);
                      setPreviewResult(null);
                      void run(true);
                    }}
                    className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-3 py-1.5 text-xs")}
                  >
                    Yes, send
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRun(false)}
                    className={cn(buttonVariants({ variant: "outline" }), "px-3 py-1.5 text-xs")}
                  >
                    Cancel
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPreviewResult(null)}
                aria-label="Close preview"
                className="rounded-full p-1 text-ink-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {previewResult.stats.problems.length > 0 && (
            <ul className="grid gap-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              {previewResult.stats.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Applications it would send ({previewResult.preview.applications.length})
            </p>
            {previewResult.preview.applications.length === 0 ? (
              <p className="text-xs text-ink-muted">None this time.</p>
            ) : (
              <ul className="grid gap-1.5">
                {previewResult.preview.applications.map((application, index) => (
                  <li key={`${application.to}-${index}`} className="rounded-lg border border-black/10 p-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewLetter((current) => (current === index ? null : index))}
                      className="flex w-full flex-wrap items-baseline gap-x-2 text-left"
                    >
                      <span className="font-semibold">{application.kind === "ad" ? "Job ad" : "Open application"}</span>
                      <span>{application.company ?? ""}</span>
                      <span className="text-ink-muted">→ {application.to}</span>
                    </button>
                    {previewLetter === index && (
                      <div className="mt-2 grid gap-1 rounded bg-black/[0.03] p-2">
                        <p>
                          <span className="text-ink-muted">Subject:</span> {application.subject}
                        </p>
                        <pre className="whitespace-pre-wrap font-sans leading-5">{application.body}</pre>
                        <p className="text-ink-muted">Attached: your CV</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Jobs it found ({previewResult.preview.jobs.length})
            </p>
            {previewResult.preview.jobs.length === 0 ? (
              <p className="text-xs text-ink-muted">No new matching jobs.</p>
            ) : (
              <ul className="grid gap-1">
                {previewResult.preview.jobs.map((job) => (
                  <li key={job.url} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="w-8 shrink-0 font-semibold tabular-nums">{job.score}</span>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      {job.title}
                    </a>
                    <span className="text-ink-muted">
                      {[job.company, job.city ?? job.location, job.source].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer font-semibold">Full preview report</summary>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 leading-5">
              {previewResult.report}
            </pre>
          </details>
        </div>
      )}
      {error && <p className="mt-4 text-sm font-semibold text-danger">{error}</p>}

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

      <details className="mt-6 text-sm" open={sentApplications.length > 0 && sentApplications.length <= 5}>
        <summary className="cursor-pointer font-semibold">Sent applications ({sentApplications.length})</summary>
        <p className="mt-1 text-xs text-ink-muted">
          Every application the agent emailed, exactly as sent. One per job ad, one per company and never twice to the
          same address.
        </p>
        {sentApplications.length === 0 ? (
          <p className="mt-2 text-xs text-ink-muted">None yet.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {sentApplications.map((item) => (
              <li key={item.id} className="rounded-xl border border-black/10 bg-background p-3 text-xs">
                <button
                  type="button"
                  onClick={() => setOpenSent((current) => (current === item.id ? null : item.id))}
                  className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 text-left"
                >
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold",
                      item.kind === "ad" ? "bg-[#E3F3E6] text-[#1B8A3A]" : "bg-accent/10 text-accent"
                    )}
                  >
                    {item.kind === "ad" ? "Job ad" : "Open application"}
                  </span>
                  <span className="font-semibold">{item.company ?? item.to_email}</span>
                  <span className="text-ink-muted">→ {item.to_email}</span>
                  <span className="ml-auto text-ink-muted">{dateTime(item.created_at)}</span>
                </button>
                {openSent === item.id && (
                  <div className="mt-3 grid gap-2 rounded-lg bg-black/[0.03] p-3">
                    <p>
                      <span className="text-ink-muted">Subject:</span>{" "}
                      <span className="font-medium">{item.subject}</span>
                    </p>
                    <pre className="whitespace-pre-wrap font-sans leading-5">{item.body}</pre>
                    {item.attachment && <p className="text-ink-muted">Attached: {item.attachment}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="mt-4 text-sm" open>
        <summary className="cursor-pointer font-semibold">Reports ({runs.length})</summary>
        <p className="mt-1 text-xs text-ink-muted">A report after every search — the daily run and every “Run now”.</p>
        {runs.length === 0 ? (
          <p className="mt-2 text-xs text-ink-muted">No runs yet.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {runs.map((run) => (
              <li key={run.id} className="rounded-xl border border-black/10 bg-background p-3 text-xs">
                <button
                  type="button"
                  onClick={() => setOpenReport((current) => (current === run.id ? null : run.id))}
                  className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 text-left"
                >
                  <span className="font-semibold">{dateTime(run.created_at)}</span>
                  <span className="text-ink-muted">{run.trigger === "cron" ? "daily run" : "Run now"}</span>
                  <span>
                    {run.stats?.saved ?? 0} new · {run.stats?.emailed?.length ?? 0} applied by email ·{" "}
                    {run.stats?.openApplications?.length ?? 0} open applications
                    {run.stats?.cleared ? ` · ${run.stats.cleared} cleared` : ""}
                  </span>
                </button>
                {openReport === run.id && run.report && (
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 leading-5">
                    {run.report}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
