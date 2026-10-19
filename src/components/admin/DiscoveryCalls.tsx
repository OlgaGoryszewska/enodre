"use client";

import { useState, type ReactNode } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCOUNTING_SYSTEM_VALUES, WEEK_4_BAR_HOURS, accountingSystemLabels } from "@/lib/potential-customer";
import {
  INTERVIEW_GUIDE,
  PILOT_INTEREST_VALUES,
  PROBLEM_CATEGORY_VALUES,
  completionProblems,
  pilotInterestLabels,
  problemCategoryLabels,
  type DiscoveryCall,
  type DiscoveryCallInput,
  type ProblemCategory,
} from "@/lib/discovery-call";

interface DiscoveryCallsProps {
  leadId: string;
  calls: DiscoveryCall[];
  onBook: (leadId: string, scheduledOn: string | null) => Promise<void>;
  onSave: (callId: string, input: DiscoveryCallInput) => Promise<void>;
  onComplete: (callId: string, input: DiscoveryCallInput) => Promise<void>;
  onCancel: (callId: string) => Promise<void>;
}

const selectClass =
  "h-10 w-full rounded-xl border border-black/10 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function formatDay(value: string | null) {
  if (!value) return "no date";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function toInput(call: DiscoveryCall): DiscoveryCallInput {
  return {
    scheduled_on: call.scheduled_on,
    problem_description: call.problem_description ?? "",
    current_workflow: call.current_workflow ?? "",
    hours_per_week: call.hours_per_week,
    accounting_system: call.accounting_system,
    systems: call.systems ?? "",
    problem_categories: call.problem_categories ?? [],
    main_bottleneck: call.main_bottleneck ?? "",
    frequency: call.frequency ?? "",
    business_impact: call.business_impact ?? "",
    decision_maker: call.decision_maker ?? "",
    pilot_interest: call.pilot_interest ?? "unknown",
    next_action: call.next_action ?? "",
    follow_up_on: call.follow_up_on,
    notes: call.notes ?? "",
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

function CallEditor({
  call,
  onSave,
  onComplete,
  onCancel,
}: {
  call: DiscoveryCall;
  onSave: DiscoveryCallsProps["onSave"];
  onComplete: DiscoveryCallsProps["onComplete"];
  onCancel: DiscoveryCallsProps["onCancel"];
}) {
  const [form, setForm] = useState<DiscoveryCallInput>(() => toInput(call));
  const [busy, setBusy] = useState<"save" | "complete" | "cancel" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const completed = call.status === "completed";
  const missing = completionProblems(form);

  function set<K extends keyof DiscoveryCallInput>(key: K, value: DiscoveryCallInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(category: ProblemCategory) {
    set(
      "problem_categories",
      form.problem_categories.includes(category)
        ? form.problem_categories.filter((value) => value !== category)
        : [...form.problem_categories, category]
    );
  }

  async function run(kind: "save" | "complete" | "cancel") {
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "save") await onSave(call.id, form);
      if (kind === "complete") await onComplete(call.id, form);
      if (kind === "cancel") await onCancel(call.id);
      setMessage({
        kind: "ok",
        text: kind === "complete" ? "Call completed — it now counts towards the week-4 gate." : "Saved.",
      });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Couldn't save." });
    } finally {
      setBusy(null);
    }
  }

  const hours = form.hours_per_week;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Call date">
            <Input
              type="date"
              value={form.scheduled_on ?? ""}
              onChange={(e) => set("scheduled_on", e.target.value || null)}
            />
          </Field>
          <Field label="Decision-maker">
            <Input value={form.decision_maker ?? ""} onChange={(e) => set("decision_maker", e.target.value)} />
          </Field>
        </div>

        <Field label="The problem, in their words" hint="Their description — not our summary.">
          <Textarea
            rows={3}
            value={form.problem_description ?? ""}
            onChange={(e) => set("problem_description", e.target.value)}
          />
        </Field>
        <Field label="Current workflow (job finished → invoice sent)">
          <Textarea
            rows={3}
            value={form.current_workflow ?? ""}
            onChange={(e) => set("current_workflow", e.target.value)}
          />
        </Field>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Which problems did they describe?</legend>
          <div className="flex flex-wrap gap-2">
            {PROBLEM_CATEGORY_VALUES.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={form.problem_categories.includes(category)}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  form.problem_categories.includes(category)
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/10 hover:border-black/30"
                )}
              >
                {problemCategoryLabels[category]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Admin hours / week"
            hint={
              hours == null
                ? `Week-4 bar: ${WEEK_4_BAR_HOURS}+ h`
                : hours >= WEEK_4_BAR_HOURS
                  ? "Meets the bar"
                  : "Below the bar"
            }
          >
            <Input
              type="number"
              min={0}
              step={0.5}
              value={hours ?? ""}
              onChange={(e) => set("hours_per_week", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Accounting system">
            <select
              className={selectClass}
              value={form.accounting_system ?? ""}
              onChange={(e) =>
                set("accounting_system", (e.target.value || null) as DiscoveryCallInput["accounting_system"])
              }
            >
              <option value="">Not asked</option>
              {ACCOUNTING_SYSTEM_VALUES.map((value) => (
                <option key={value} value={value}>
                  {accountingSystemLabels[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pilot interest">
            <select
              className={selectClass}
              value={form.pilot_interest}
              onChange={(e) => set("pilot_interest", e.target.value as DiscoveryCallInput["pilot_interest"])}
            >
              {PILOT_INTEREST_VALUES.map((value) => (
                <option key={value} value={value}>
                  {pilotInterestLabels[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Other systems (field apps, sheets…)">
            <Input value={form.systems ?? ""} onChange={(e) => set("systems", e.target.value)} />
          </Field>
          <Field label="How often it happens">
            <Input value={form.frequency ?? ""} onChange={(e) => set("frequency", e.target.value)} />
          </Field>
          <Field label="Main bottleneck">
            <Input value={form.main_bottleneck ?? ""} onChange={(e) => set("main_bottleneck", e.target.value)} />
          </Field>
          <Field label="Business impact">
            <Input value={form.business_impact ?? ""} onChange={(e) => set("business_impact", e.target.value)} />
          </Field>
          <Field label="Agreed next action">
            <Input value={form.next_action ?? ""} onChange={(e) => set("next_action", e.target.value)} />
          </Field>
          <Field label="Follow up on" hint="Shows in Today's priorities.">
            <Input
              type="date"
              value={form.follow_up_on ?? ""}
              onChange={(e) => set("follow_up_on", e.target.value || null)}
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void run("save")}
            disabled={busy !== null}
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
          >
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save
          </button>
          {!completed && (
            <button
              type="button"
              onClick={() => void run("complete")}
              disabled={busy !== null || missing.length > 0}
              className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
            >
              {busy === "complete" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Mark call completed
            </button>
          )}
          {!completed && (
            <button
              type="button"
              onClick={() => void run("cancel")}
              disabled={busy !== null}
              className="px-2 text-sm font-semibold text-ink-muted hover:text-danger"
            >
              Cancel call
            </button>
          )}
        </div>
        {!completed && missing.length > 0 && (
          <p className="text-xs text-ink-muted">To complete it, add {missing.join(", ")}.</p>
        )}
        {message && (
          <p className={cn("text-sm", message.kind === "ok" ? "text-ink-muted" : "text-danger")} role="status">
            {message.text}
          </p>
        )}
      </div>

      <aside className="grid content-start gap-4 rounded-xl border border-black/10 bg-background p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Interview guide</p>
        {INTERVIEW_GUIDE.map((section) => (
          <div key={section.title}>
            <p className="font-semibold">{section.title}</p>
            <ul className="mt-1 grid gap-1 text-ink-muted">
              {section.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}

/** Discovery calls for one lead — booking, the write-up, completion. */
export function DiscoveryCalls({ leadId, calls, onBook, onSave, onComplete, onCancel }: DiscoveryCallsProps) {
  const [date, setDate] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(() => calls.find((call) => call.status === "booked")?.id ?? null);

  async function book() {
    setBooking(true);
    setError(null);
    try {
      await onBook(leadId, date || null);
      setDate("");
    } catch {
      setError("Couldn't book the call. Has gtm_command_centre.sql been run in Supabase?");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Discovery calls</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Record what they tell you. Completed calls feed the week-4 gate.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="grid gap-1 text-xs text-ink-muted">
            Date (optional)
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </label>
          <button
            type="button"
            onClick={() => void book()}
            disabled={booking}
            className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
          >
            {booking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            )}
            Book a call
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {calls.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
          No calls yet.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {calls.map((call) => (
            <li key={call.id} className="rounded-xl border border-black/10 bg-background">
              <button
                type="button"
                onClick={() => setOpenId(openId === call.id ? null : call.id)}
                aria-expanded={openId === call.id}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm"
              >
                <span className="font-semibold">
                  {call.status === "completed"
                    ? `Completed ${formatDay(call.completed_on)}`
                    : call.status === "cancelled"
                      ? "Cancelled"
                      : `Booked · ${formatDay(call.scheduled_on)}`}
                </span>
                <span className="text-xs text-ink-muted">
                  {call.hours_per_week != null && `${call.hours_per_week} h/week · `}
                  {pilotInterestLabels[call.pilot_interest]} pilot interest
                </span>
              </button>
              {openId === call.id && call.status !== "cancelled" && (
                <div className="border-t border-black/10 p-4">
                  <CallEditor call={call} onSave={onSave} onComplete={onComplete} onCancel={onCancel} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
