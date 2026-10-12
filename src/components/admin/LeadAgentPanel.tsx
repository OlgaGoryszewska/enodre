"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Loader2, Search, Sparkles, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  LEAD_COUNTIES,
  LEAD_INDUSTRIES,
  LEAD_SEARCH_DEFAULTS,
  RESEARCH_BUDGET,
  canStartResearch,
  linkedInSearchUrl,
  type LeadCandidate,
} from "@/lib/lead-candidate";
import type { FindLeadsInput } from "@/app/admin/marketing/lead-agent-actions";

interface LeadAgentPanelProps {
  candidates: LeadCandidate[];
  monthSpendUsd: number;
  onFind: (input: FindLeadsInput) => Promise<{ added: number; totalMatches: number }>;
  onResearch: (id: string) => Promise<void>;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

type Tab = "found" | "researched" | "failed" | "approved";

const TAB_LABELS: Record<Tab, string> = {
  found: "To research",
  researched: "Ready to review",
  failed: "Failed",
  approved: "Approved",
};

const BATCH_SIZE = 5;

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function LeadAgentPanel({ candidates, monthSpendUsd, onFind, onResearch, onApprove, onReject }: LeadAgentPanelProps) {
  const [industryCodes, setIndustryCodes] = useState<string[]>(LEAD_SEARCH_DEFAULTS.industryCodes);
  const [countyCodes, setCountyCodes] = useState<string[]>(LEAD_SEARCH_DEFAULTS.countyCodes);
  const [minEmployees, setMinEmployees] = useState(LEAD_SEARCH_DEFAULTS.minEmployees);
  const [maxEmployees, setMaxEmployees] = useState(LEAD_SEARCH_DEFAULTS.maxEmployees);
  const [limit, setLimit] = useState(LEAD_SEARCH_DEFAULTS.limit);
  const [finding, setFinding] = useState(false);
  const [findResult, setFindResult] = useState<string | null>(null);
  const [findError, setFindError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("researched");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const groups: Record<Tab, LeadCandidate[]> = { found: [], researched: [], failed: [], approved: [] };
    for (const candidate of candidates) {
      if (candidate.status in groups) groups[candidate.status as Tab].push(candidate);
    }
    groups.researched.sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0));
    return groups;
  }, [candidates]);

  const budgetLeft = canStartResearch(monthSpendUsd);

  async function runFind() {
    setFinding(true);
    setFindResult(null);
    setFindError(null);
    try {
      const result = await onFind({ industryCodes, countyCodes, minEmployees, maxEmployees, limit } as FindLeadsInput);
      setFindResult(
        result.added === 0
          ? `No new companies — all ${result.totalMatches} matches are already in the queue.`
          : `Added ${result.added} new companies (${result.totalMatches} match these filters in total).`
      );
      setTab("found");
    } catch (error) {
      setFindError(errorMessage(error));
    } finally {
      setFinding(false);
    }
  }

  async function withBusy(id: string, action: () => Promise<void>) {
    setBusyIds((current) => new Set(current).add(id));
    setActionError(null);
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(errorMessage(error));
      return false;
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  // One request per company, in sequence — each takes about a minute, and
  // separate requests keep every call well inside the function time limit.
  async function researchBatch() {
    const batch = byStatus.found.slice(0, BATCH_SIZE);
    setBatchProgress({ done: 0, total: batch.length });
    for (const [index, candidate] of batch.entries()) {
      const ok = await withBusy(candidate.id, () => onResearch(candidate.id));
      setBatchProgress({ done: index + 1, total: batch.length });
      // Stop on the first refusal (e.g. budget reached) instead of hammering on.
      if (!ok) break;
    }
    setBatchProgress(null);
  }

  const isResearching = batchProgress !== null || [...busyIds].some((id) => byStatus.found.some((c) => c.id === id));

  return (
    <div className="grid gap-8">
      {/* Finder */}
      <div className="grid gap-5 rounded-xl border border-black/10 bg-background p-5">
        <div>
          <h3 className="font-semibold">1. Find companies</h3>
          <p className="mt-1 text-sm text-ink-muted">
            From Brønnøysundregistrene — active companies only. Free. Companies already in the queue are skipped.
          </p>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Industries</legend>
          <p className="-mt-1 mb-1 text-xs text-ink-muted">
            F = close to our FuelFlo case study (the research may mention it) · A/B/C = Jobb-til-faktura fit, best first
          </p>
          <div className="flex flex-wrap gap-2">
            {LEAD_INDUSTRIES.map((industry) => (
              <label
                key={industry.code}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                  industryCodes.includes(industry.code)
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/10 text-foreground hover:border-black/30"
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={industryCodes.includes(industry.code)}
                  onChange={() => setIndustryCodes((current) => toggle(current, industry.code))}
                />
                <span className="text-xs opacity-60">{industry.priority}</span>
                {industry.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Counties</legend>
          <div className="flex flex-wrap gap-2">
            {LEAD_COUNTIES.map((county) => (
              <label
                key={county.code}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition",
                  countyCodes.includes(county.code)
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/10 text-foreground hover:border-black/30"
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={countyCodes.includes(county.code)}
                  onChange={() => setCountyCodes((current) => toggle(current, county.code))}
                />
                {county.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Min employees</span>
            <Input type="number" min={0} value={minEmployees} onChange={(event) => setMinEmployees(Number(event.target.value))} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Max employees</span>
            <Input type="number" min={1} value={maxEmployees} onChange={(event) => setMaxEmployees(Number(event.target.value))} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">How many</span>
            <Input type="number" min={1} max={50} value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void runFind()}
            disabled={finding || industryCodes.length === 0 || countyCodes.length === 0}
            className={cn(buttonVariants({ variant: "primary" }), "bg-foreground")}
          >
            {finding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            {finding ? "Searching the register..." : "Find companies"}
          </button>
          {findResult && <p className="text-sm text-ink-muted">{findResult}</p>}
          {findError && <p className="text-sm text-danger">{findError}</p>}
        </div>
      </div>

      {/* Queue */}
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap rounded-full border border-black/10 bg-black/[0.03] p-1">
            {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  tab === key ? "bg-background text-foreground shadow-sm" : "text-ink-muted"
                )}
              >
                {TAB_LABELS[key]} <span className="opacity-60">{byStatus[key].length}</span>
              </button>
            ))}
          </div>
          <p className={cn("text-xs", budgetLeft ? "text-ink-muted" : "font-semibold text-danger")}>
            This month: {Number.isFinite(monthSpendUsd) ? `$${monthSpendUsd.toFixed(2)}` : "unknown"} of $
            {RESEARCH_BUDGET.monthlyUsd} research budget
          </p>
        </div>

        {actionError && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        {tab === "found" && (
          <div className="grid gap-3">
            {byStatus.found.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-background p-4">
                <div className="flex-1 text-sm">
                  <p className="font-semibold">2. Research with Claude</p>
                  <p className="text-ink-muted">
                    About a minute per company, stopped at ${RESEARCH_BUDGET.perCompanyUsd.toFixed(2)} each. Reads their
                    website and public sources, then drafts a message.
                  </p>
                  {!budgetLeft && (
                    <p className="mt-1 font-semibold text-danger">Monthly budget reached — research resumes on the 1st.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void researchBatch()}
                  disabled={isResearching || !budgetLeft}
                  className={cn(buttonVariants({ variant: "primary" }), "bg-foreground")}
                >
                  {batchProgress ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Researching {batchProgress.done + 1} of {batchProgress.total}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Research next {Math.min(BATCH_SIZE, byStatus.found.length)}
                    </>
                  )}
                </button>
              </div>
            )}
            {byStatus.found.length === 0 ? (
              <EmptyState text="Nothing to research. Find companies above." />
            ) : (
              byStatus.found.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-background px-4 py-3"
                >
                  <CompanyLine candidate={candidate} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void withBusy(candidate.id, () => onResearch(candidate.id))}
                      disabled={isResearching || !budgetLeft}
                      className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
                    >
                      {busyIds.has(candidate.id) ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Research"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void withBusy(candidate.id, () => onReject(candidate.id))}
                      disabled={busyIds.has(candidate.id)}
                      aria-label={`Skip ${candidate.company}`}
                      className="rounded-full p-2 text-ink-muted transition hover:bg-black/5 hover:text-foreground"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "researched" &&
          (byStatus.researched.length === 0 ? (
            <EmptyState text="No researched companies yet." />
          ) : (
            <div className="grid gap-4">
              {byStatus.researched.map((candidate) => (
                <ReviewCard
                  key={candidate.id}
                  candidate={candidate}
                  busy={busyIds.has(candidate.id)}
                  onApprove={() => void withBusy(candidate.id, () => onApprove(candidate.id))}
                  onReject={() => void withBusy(candidate.id, () => onReject(candidate.id))}
                />
              ))}
            </div>
          ))}

        {tab === "failed" &&
          (byStatus.failed.length === 0 ? (
            <EmptyState text="Nothing failed." />
          ) : (
            byStatus.failed.map((candidate) => (
              <div
                key={candidate.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-background px-4 py-3"
              >
                <div className="grid gap-1">
                  <CompanyLine candidate={candidate} />
                  <p className="text-xs text-danger">{candidate.error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void withBusy(candidate.id, () => onResearch(candidate.id))}
                  disabled={busyIds.has(candidate.id) || !budgetLeft}
                  className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
                >
                  {busyIds.has(candidate.id) ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Retry"}
                </button>
              </div>
            ))
          ))}

        {tab === "approved" &&
          (byStatus.approved.length === 0 ? (
            <EmptyState text="Approved companies are copied into the Leads pipeline above." />
          ) : (
            byStatus.approved.map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-2 rounded-xl border border-black/10 bg-background px-4 py-3">
                <Check className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <CompanyLine candidate={candidate} />
              </div>
            ))
          ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">{text}</p>;
}

function CompanyLine({ candidate }: { candidate: LeadCandidate }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold">{candidate.company}</p>
      <p className="text-xs text-ink-muted">
        {[
          candidate.industry_label,
          candidate.employees != null && `${candidate.employees} employees`,
          candidate.municipality,
          candidate.contact_name && `${candidate.contact_name}${candidate.contact_role ? ` (${candidate.contact_role})` : ""}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

function ReviewCard({
  candidate,
  busy,
  onApprove,
  onReject,
}: {
  candidate: LeadCandidate;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [showEnglish, setShowEnglish] = useState(false);
  const [copied, setCopied] = useState(false);
  const research = candidate.research;
  if (!research) return null;
  const websiteUrl = candidate.website ?? research.website;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(research!.message_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (permissions, insecure origin) — the text is
      // still selectable on screen.
    }
  }

  return (
    <article className="grid gap-4 rounded-xl border border-black/10 bg-background p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CompanyLine candidate={candidate} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {candidate.contact_name && (
              <a
                href={linkedInSearchUrl(candidate)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline"
              >
                Find {candidate.contact_name} on LinkedIn <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ink-muted hover:underline"
              >
                Website <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
            {candidate.phone && <span className="text-ink-muted">Phone: {candidate.phone}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold leading-none">
            {research.fit_score}
            <span className="text-sm text-ink-muted">/5</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">{research.confidence} confidence</p>
        </div>
      </header>

      <p className="text-sm">{research.summary}</p>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-black/[0.03] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Likely pain</p>
          <p className="mt-1">{research.likely_pain}</p>
          <p className="mt-2 text-xs text-ink-muted">{research.pain_evidence}</p>
        </div>
        <div className="rounded-lg bg-black/[0.03] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">How we help</p>
          <p className="mt-1">{research.how_we_help}</p>
          <p className="mt-2 text-xs text-ink-muted">Fit: {research.fit_reason}</p>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">
          Evidence ({research.facts.length} facts, {research.signals.length} signals)
        </summary>
        <ul className="mt-2 grid gap-1.5">
          {[...research.facts.map((f) => ({ text: f.fact, url: f.source_url })), ...research.signals.map((s) => ({ text: s.signal, url: s.source_url }))].map(
            (item, index) => (
              <li key={index} className="text-ink-muted">
                {item.text}{" "}
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">
                  source
                </a>
              </li>
            )
          )}
        </ul>
      </details>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Message (check every claim before sending)</p>
          <div className="flex gap-3 text-xs font-semibold">
            <button type="button" onClick={() => setShowEnglish((value) => !value)} className="text-ink-muted hover:text-foreground">
              {showEnglish ? "Show Norwegian" : "Show English"}
            </button>
            <button type="button" onClick={() => void copyMessage()} className="inline-flex items-center gap-1 hover:underline">
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? "Copied" : "Copy Norwegian"}
            </button>
          </div>
        </div>
        <p className="whitespace-pre-line rounded-lg border border-black/10 p-3 text-sm leading-6">
          {showEnglish ? research.message_en : research.message_no}
        </p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">Research cost: ${Number(candidate.cost_usd ?? 0).toFixed(2)}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Approve → Leads pipeline
          </button>
        </div>
      </footer>
    </article>
  );
}
