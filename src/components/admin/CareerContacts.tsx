"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, ExternalLink, Loader2, Plus, Search, Send, Sparkles, Trash2, Users, X } from "lucide-react";
import type { FindCandidatesResult, PreparedContact } from "@/app/admin/linkedin/career-contacts-actions";
import type { CareerCandidate } from "@/lib/career-candidates";
import { linkedinNote } from "@/lib/job-matching";
import { Accordion } from "@/components/admin/Accordion";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CAREER_KIND_VALUES,
  CAREER_STATUS_VALUES,
  careerKindLabels,
  careerStatusLabels,
  type CareerContact,
  type CareerKind,
  type CareerStatus,
} from "@/lib/career-contact";

type Filter = "all" | CareerKind | "HealthTech" | "BeautyTech";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "agency", label: "Agencies" },
  { value: "recruiter", label: "Recruiters" },
  { value: "HealthTech", label: "HealthTech" },
  { value: "BeautyTech", label: "BeautyTech" },
];

// Matches the server's per-request limit.
const BATCH = 25;

const FIT_ORDER = { high: 0, medium: 1, low: 2 } as const;

const FIT_STYLES = {
  high: "bg-[#E3F3E6] text-[#1B8A3A]",
  medium: "bg-accent/10 text-accent",
  low: "bg-black/5 text-ink-muted",
} as const;

/** Recruiters, agencies and target companies, with a status for each. */
export function CareerContacts({
  contacts,
  setupMissing,
  reportUrl,
  onAdd,
  onUpdate,
  onDelete,
  onPrepare,
  onSend,
  onFind,
  onAddCandidates,
}: {
  contacts: CareerContact[];
  setupMissing: boolean;
  reportUrl: string;
  onAdd: (input: {
    kind: CareerKind;
    name: string;
    organisation: string;
    linkedin: string;
    email: string;
    notes: string;
  }) => Promise<void>;
  onUpdate: (id: string, input: { status?: CareerStatus; notes?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPrepare: (ids: string[]) => Promise<{ items: PreparedContact[]; more: number }>;
  onSend: (ids: string[]) => Promise<{ name: string; to: string | null; ok: boolean; detail: string }[]>;
  onFind: () => Promise<FindCandidatesResult>;
  onAddCandidates: (
    candidates: CareerCandidate[]
  ) => Promise<{ ok: true; added: number } | { ok: false; error: string }>;
}) {
  const [finding, setFinding] = useState(false);
  const [noteCopied, setNoteCopied] = useState<string | null>(null);
  const [found, setFound] = useState<{ candidates: CareerCandidate[]; sources: string[] } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{ items: PreparedContact[]; more: number } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [letterId, setLetterId] = useState<string | null>(null);
  const [sendResults, setSendResults] = useState<{ name: string; to: string | null; ok: boolean; detail: string }[]>(
    []
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [hideDone, setHideDone] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    kind: "recruiter" as CareerKind,
    name: "",
    organisation: "",
    linkedin: "",
    email: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = useMemo(
    () =>
      contacts
        .filter((contact) => {
          if (hideDone && contact.status === "not_relevant") return false;
          if (filter === "all") return true;
          if (filter === "HealthTech" || filter === "BeautyTech") return contact.industry === filter;
          return contact.kind === filter;
        })
        .sort((a, b) => FIT_ORDER[a.fit ?? "medium"] - FIT_ORDER[b.fit ?? "medium"] || a.name.localeCompare(b.name)),
    [contacts, filter, hideDone]
  );

  async function find() {
    setFinding(true);
    setError(null);
    setAddedMessage(null);
    try {
      const result = await onFind();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFound({ candidates: result.candidates, sources: result.sources });
      // The best fits are ticked; anyone applied to before is left for you to decide.
      setPicked(
        new Set(result.candidates.filter((item) => item.fit === "high" && !item.appliedBefore).map((item) => item.name))
      );
    } catch {
      setError("Couldn't look for new contacts. Try again.");
    } finally {
      setFinding(false);
    }
  }

  function addPicked() {
    if (!found) return;
    const chosen = found.candidates.filter((item) => picked.has(item.name));
    run(async () => {
      const result = await onAddCandidates(chosen);
      if (!result.ok) throw new Error(result.error);
      setAddedMessage(
        `Added ${result.added} to the list${result.added < chosen.length ? ` (${chosen.length - result.added} were already there)` : ""}.`
      );
      setFound(null);
    });
  }

  async function prepare(ids: string[]) {
    setPreparing(true);
    setError(null);
    setSendResults([]);
    setConfirmSend(false);
    try {
      // In batches: each request has a time limit, the list doesn't.
      const items: PreparedContact[] = [];
      let more = 0;
      for (let start = 0; start < ids.length; start += BATCH) {
        setProgress(`Finding addresses… ${Math.min(start + BATCH, ids.length)} of ${ids.length}`);
        const result = await onPrepare(ids.slice(start, start + BATCH));
        items.push(...result.items);
        more += result.more;
      }
      setPrepared({ items, more });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't prepare the emails.");
    } finally {
      setPreparing(false);
      setProgress(null);
    }
  }

  async function send(ids: string[]) {
    setSending(true);
    setError(null);
    setConfirmSend(false);
    try {
      const results: Awaited<ReturnType<typeof onSend>> = [];
      for (let start = 0; start < ids.length; start += BATCH) {
        setProgress(`Sending… ${Math.min(start + BATCH, ids.length)} of ${ids.length}`);
        results.push(...(await onSend(ids.slice(start, start + BATCH))));
      }
      setSendResults(results);
      setPrepared(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send.");
    } finally {
      setSending(false);
      setProgress(null);
    }
  }

  function run(work: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await work();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  if (setupMissing) {
    return (
      <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">Recruiters &amp; companies</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Run supabase/career_contacts.sql in the Supabase SQL Editor to switch it on.
        </p>
      </div>
    );
  }

  // Recruiters only with a saved email: there's no general address to look up.
  const notContacted = shown.filter(
    (contact) => contact.status === "to_contact" && (contact.kind !== "recruiter" || contact.email)
  );
  const sendable = prepared?.items.filter((item) => !item.problem) ?? [];
  const countOf = (status: CareerStatus) => contacts.filter((contact) => contact.status === status).length;
  const totals = [
    { label: "To contact", value: countOf("to_contact") },
    { label: "Contacted", value: countOf("contacted") },
    { label: "Replied", value: countOf("replied") },
    { label: "Interviewing", value: countOf("interviewing") },
  ];
  const lastDay = contacts.reduce((latest, contact) => {
    const day = contact.last_contacted_on ?? "";
    return day > latest ? day : latest;
  }, "");
  const lastContacted = lastDay ? contacts.filter((contact) => contact.last_contacted_on === lastDay) : [];
  const contacted = contacts.filter((contact) => contact.status !== "to_contact" && contact.status !== "not_relevant");

  return (
    <Accordion
      icon={<Users className="h-4 w-4" aria-hidden="true" />}
      title="Recruiters & companies"
      subtitle={`${contacted.length} of ${contacts.length} contacted`}
      keepMounted
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-ink-muted">
            HealthTech and BeautyTech agencies, recruiters and target companies. {contacted.length} of {contacts.length}{" "}
            contacted.{" "}
            <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
              Open the research report
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={preparing || sending || notContacted.length === 0}
            onClick={() => void prepare(notContacted.map((contact) => contact.id))}
            className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
          >
            {preparing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {(preparing || sending) && progress ? progress : `Message all (${notContacted.length})`}
          </button>
          <button
            type="button"
            disabled={finding}
            onClick={() => void find()}
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
          >
            {finding ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {finding ? "Looking…" : "Find new contacts"}
          </button>
          <button
            type="button"
            onClick={() => setAdding((current) => !current)}
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add a recruiter
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {totals.map((total) => (
          <div key={total.label} className="rounded-xl border border-black/10 bg-background p-3">
            <dt className="text-xs text-ink-muted">{total.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{total.value}</dd>
          </div>
        ))}
      </dl>
      {lastContacted.length > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          Last contacted {lastDay}: {lastContacted.map((contact) => contact.name).join(", ")}
        </p>
      )}

      {addedMessage && <p className="mt-4 text-sm text-ink-muted">{addedMessage}</p>}

      {found && (
        <div className="mt-4 grid gap-3 rounded-xl border border-foreground/20 bg-background p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">
                Preview: {found.candidates.length} new {found.candidates.length === 1 ? "contact" : "contacts"} found.
                Nothing added yet.
              </p>
              <p className="text-xs text-ink-muted">From {found.sources.join(" · ")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPicked(
                    picked.size === found.candidates.length
                      ? new Set()
                      : new Set(found.candidates.map((item) => item.name))
                  )
                }
                className="text-xs font-semibold text-ink-muted hover:text-foreground"
              >
                {picked.size === found.candidates.length ? "Untick all" : "Tick all"}
              </button>
              <button
                type="button"
                disabled={picked.size === 0 || pending}
                onClick={addPicked}
                className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-3 py-1.5 text-xs")}
              >
                Add {picked.size} to the list
              </button>
              <button
                type="button"
                onClick={() => setFound(null)}
                aria-label="Close preview"
                className="rounded-full p-1 text-ink-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          {found.candidates.length === 0 ? (
            <p className="text-xs text-ink-muted">
              Nobody new right now. The list grows as the job agent finds more ads.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {found.candidates.map((item) => (
                <li key={item.name} className="flex items-start gap-3 rounded-lg border border-black/10 p-2 text-xs">
                  <input
                    type="checkbox"
                    aria-label={`Add ${item.name}`}
                    checked={picked.has(item.name)}
                    onChange={() =>
                      setPicked((current) => {
                        const next = new Set(current);
                        if (next.has(item.name)) next.delete(item.name);
                        else next.add(item.name);
                        return next;
                      })
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{item.name}</span>
                      <span className={cn("rounded-full px-2 py-0.5 font-semibold", FIT_STYLES[item.fit])}>
                        {item.fit}
                      </span>
                      <span className="text-ink-muted">
                        {[item.kind === "agency" ? "Agency" : "Company", item.industry, item.coverage]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {item.appliedBefore && (
                        <span className="rounded-full bg-black/5 px-2 py-0.5 font-semibold">Applied before</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-ink-muted">{item.reason}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {item.website && (
                      <a
                        href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${item.name} website`}
                        className="text-ink-muted hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                    <a
                      href={item.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-foreground"
                    >
                      <Search className="h-3.5 w-3.5" aria-hidden="true" /> People
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {prepared && (
        <div className="mt-4 grid gap-3 rounded-xl border border-foreground/20 bg-background p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              Preview: {sendable.length} ready to send, with your CV, from your Gmail. Nothing sent yet.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {!confirmSend ? (
                <button
                  type="button"
                  disabled={sendable.length === 0 || sending}
                  onClick={() => setConfirmSend(true)}
                  className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-3 py-1.5 text-xs")}
                >
                  {sending ? "Sending…" : `Send ${sendable.length}`}
                </button>
              ) : (
                <>
                  <span className="text-xs font-semibold">Send these {sendable.length} emails now?</span>
                  <button
                    type="button"
                    onClick={() => void send(sendable.map((item) => item.id))}
                    className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-3 py-1.5 text-xs")}
                  >
                    Yes, send
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPrepared(null)}
                className={cn(buttonVariants({ variant: "outline" }), "px-3 py-1.5 text-xs")}
              >
                Cancel
              </button>
            </div>
          </div>
          <ul className="grid gap-1.5">
            {prepared.items.map((item) => (
              <li key={item.id} className="rounded-lg border border-black/10 p-2 text-xs">
                <button
                  type="button"
                  onClick={() => setLetterId((current) => (current === item.id ? null : item.id))}
                  className="flex w-full flex-wrap items-baseline gap-x-2 text-left"
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className={item.problem ? "text-danger" : "text-ink-muted"}>
                    {item.problem ?? `→ ${item.to}`}
                  </span>
                </button>
                {letterId === item.id && (
                  <div className="mt-2 grid gap-1 rounded bg-black/[0.03] p-2">
                    <p>
                      <span className="text-ink-muted">Subject:</span> {item.subject}
                    </p>
                    <pre className="whitespace-pre-wrap font-sans leading-5">{item.body}</pre>
                    <p className="text-ink-muted">Attached: your CV</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {prepared.more > 0 && (
            <p className="text-xs text-ink-muted">
              {prepared.more} couldn&apos;t be checked in time: click Message all again for those.
            </p>
          )}
        </div>
      )}

      {sendResults.length > 0 && (
        <div className="mt-4 rounded-xl border border-black/10 bg-background p-4 text-sm">
          <p className="font-semibold">
            Sent {sendResults.filter((item) => item.ok).length} of {sendResults.length}
          </p>
          <ul className="mt-2 grid gap-1 text-xs">
            {sendResults.map((item) => (
              <li key={item.name}>
                <span className="font-medium">{item.name}</span>{" "}
                <span className={item.ok ? "text-ink-muted" : "text-danger"}>
                  {item.ok ? `→ ${item.to}` : item.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {adding && (
        <div className="mt-4 grid gap-2 rounded-xl border border-black/10 bg-background p-4 sm:grid-cols-2">
          <select
            aria-label="Type"
            className="h-10 rounded-xl border border-black/10 bg-background px-3 text-sm"
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value as CareerKind })}
          >
            {CAREER_KIND_VALUES.map((kind) => (
              <option key={kind} value={kind}>
                {careerKindLabels[kind]}
              </option>
            ))}
          </select>
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            placeholder="Agency or company"
            value={form.organisation}
            onChange={(event) => setForm({ ...form, organisation: event.target.value })}
          />
          <Input
            placeholder="LinkedIn URL"
            value={form.linkedin}
            onChange={(event) => setForm({ ...form, linkedin: event.target.value })}
          />
          <Input
            placeholder="Email (optional)"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <Input
            placeholder="Notes (what they recruit for)"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
          <button
            type="button"
            disabled={pending || !form.name.trim()}
            onClick={() =>
              run(async () => {
                await onAdd(form);
                setForm({ ...form, name: "", organisation: "", linkedin: "", email: "", notes: "" });
                setAdding(false);
              })
            }
            className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm sm:col-span-2")}
          >
            Save
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              filter === item.value
                ? "border-foreground bg-foreground text-background"
                : "border-black/10 hover:border-black/30"
            )}
          >
            {item.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" checked={hideDone} onChange={(event) => setHideDone(event.target.checked)} />
          Hide “not relevant”
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
          Nothing here yet. Add recruiters you find on LinkedIn.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {shown.map((contact) => (
            <li key={contact.id} className="rounded-xl border border-black/10 bg-background p-3 text-sm">
              <div className="flex flex-wrap items-start gap-3">
                {contact.fit && (
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", FIT_STYLES[contact.fit])}>
                    {contact.fit}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpenId((current) => (current === contact.id ? null : contact.id))}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-semibold">
                    {contact.name}
                    {contact.organisation ? ` · ${contact.organisation}` : ""}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {[careerKindLabels[contact.kind], contact.coverage, contact.roles ?? contact.specialisation]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {contact.website && (
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${contact.name} website`}
                      className="text-ink-muted hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                  {contact.linkedin && (
                    <a
                      href={contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-foreground"
                    >
                      {contact.kind === "agency" ? (
                        <>
                          <Search className="h-3.5 w-3.5" aria-hidden="true" /> Find recruiters
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> LinkedIn
                        </>
                      )}
                    </a>
                  )}
                  {contact.linkedin && (
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(linkedinNote(contact))
                          .then(() => setNoteCopied(contact.id))
                          .catch(() => undefined)
                      }
                      title="A short personal note for a LinkedIn connection request, ready to paste"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      {noteCopied === contact.id ? "Note copied" : "LinkedIn note"}
                    </button>
                  )}
                  {contact.status === "to_contact" && (
                    <button
                      type="button"
                      disabled={preparing || sending}
                      onClick={() => void prepare([contact.id])}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-foreground"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" /> Contact
                    </button>
                  )}
                  <select
                    aria-label={`Status of ${contact.name}`}
                    value={contact.status}
                    disabled={pending}
                    onChange={(event) =>
                      run(() => onUpdate(contact.id, { status: event.target.value as CareerStatus }))
                    }
                    className="rounded-full border border-black/10 bg-background px-2 py-1 text-xs"
                  >
                    {CAREER_STATUS_VALUES.map((status) => (
                      <option key={status} value={status}>
                        {careerStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {openId === contact.id && (
                <div className="mt-3 grid gap-2 rounded-lg bg-black/[0.03] p-3 text-xs">
                  {contact.specialisation && <p>{contact.specialisation}</p>}
                  {contact.email && <p>Email: {contact.email}</p>}
                  {contact.last_contacted_on && <p>Last contacted: {contact.last_contacted_on}</p>}
                  <Textarea
                    aria-label={`Notes on ${contact.name}`}
                    rows={2}
                    placeholder="Notes"
                    defaultValue={contact.notes ?? ""}
                    onBlur={(event) => {
                      if (event.target.value !== (contact.notes ?? "")) {
                        run(() => onUpdate(contact.id, { notes: event.target.value }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Delete ${contact.name}?`)) run(() => onDelete(contact.id));
                    }}
                    className="inline-flex items-center gap-1 justify-self-start font-semibold text-ink-muted hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Accordion>
  );
}
