"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Plus, Search, Trash2, Users } from "lucide-react";
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
}) {
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

  const contacted = contacts.filter((contact) => contact.status !== "to_contact" && contact.status !== "not_relevant");

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Users className="h-5 w-5 text-accent" aria-hidden="true" /> Recruiters &amp; companies
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            HealthTech and BeautyTech agencies, recruiters and target companies. {contacted.length} of {contacts.length}{" "}
            contacted.{" "}
            <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
              Open the research report
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add a recruiter
        </button>
      </div>

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
    </div>
  );
}
