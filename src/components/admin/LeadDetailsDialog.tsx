"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink, Loader2, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { INDUSTRY_VALUES, PLAYBOOKS, type Industry } from "@/lib/industry-playbooks";
import type { PotentialCustomerDetails } from "@/lib/potential-customer-schema";
import {
  BEST_CHANNEL_VALUES,
  SEGMENT_VALUES,
  bestChannelLabels,
  segmentLabels,
  type PotentialCustomer,
} from "@/lib/potential-customer";

// Form state is all strings (what inputs hold); converted on save.
type FormState = Record<keyof PotentialCustomerDetails, string>;

// The follow-up fields need gtm_command_centre.sql; before it runs the
// columns are missing (undefined) and the dialog leaves them out.
function hasFollowUpColumns(lead: PotentialCustomer) {
  return lead.next_follow_up_on !== undefined;
}
// Same for industry / do-not-contact / deal value (outreach_system.sql).
function hasOutreachColumns(lead: PotentialCustomer) {
  return lead.industry !== undefined;
}

function toFormState(lead: PotentialCustomer): FormState {
  const text = (value: string | number | null) => (value == null ? "" : String(value));
  return {
    email: text(lead.email),
    phone: text(lead.phone),
    segment: text(lead.segment),
    employees: text(lead.employees),
    location: text(lead.location),
    org_number: text(lead.org_number),
    website: text(lead.website),
    best_channel: text(lead.best_channel),
    opener_fact: text(lead.opener_fact),
    opener_source: text(lead.opener_source),
    first_contacted_on: text(lead.first_contacted_on),
    next_follow_up_on: text(lead.next_follow_up_on ?? null),
    next_action: text(lead.next_action ?? null),
    industry: text(lead.industry ?? null),
    do_not_contact: lead.do_not_contact ? "true" : "",
    deal_value_nok: text(lead.deal_value_nok ?? null),
  };
}

function toDetails(form: FormState, withFollowUp: boolean, withOutreach: boolean): PotentialCustomerDetails {
  const number = (value: string) => (value.trim() === "" ? null : Number(value));
  const choice = <T extends string>(value: string) => (value === "" ? null : (value as T));
  return {
    email: form.email,
    phone: form.phone,
    segment: choice(form.segment),
    employees: number(form.employees),
    location: form.location,
    org_number: form.org_number,
    website: form.website,
    best_channel: choice(form.best_channel),
    opener_fact: form.opener_fact,
    opener_source: form.opener_source,
    first_contacted_on: form.first_contacted_on || null,
    ...(withFollowUp ? { next_follow_up_on: form.next_follow_up_on || null, next_action: form.next_action } : {}),
    ...(withOutreach
      ? {
          industry: choice<Industry>(form.industry),
          do_not_contact: form.do_not_contact === "true",
          deal_value_nok: number(form.deal_value_nok),
        }
      : {}),
  };
}

const selectClass =
  "h-10 w-full rounded-xl border border-black/10 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-black/10 pt-5">
      <legend className="pr-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

export function LeadDetailsDialog({
  lead,
  onSave,
}: {
  lead: PotentialCustomer;
  onSave: (id: string, details: PotentialCustomerDetails) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => toFormState(lead));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleOpenChange(next: boolean) {
    // Re-read the lead each time it opens, so a cancelled edit doesn't linger.
    if (next) {
      setForm(toFormState(lead));
      setError(null);
    }
    setOpen(next);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave(lead.id, toDetails(form, hasFollowUpColumns(lead), hasOutreachColumns(lead)));
      setOpen(false);
    } catch {
      setError("Couldn't save. Check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-ink-muted transition hover:border-black/25 hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Details
        </button>
      </DialogTrigger>
      <DialogContent open={open} className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogTitle className="text-lg font-semibold tracking-tight">{lead.company || lead.name}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-muted">
          {lead.name} · the fields the GTM plan decides on.
        </DialogDescription>

        <div className="mt-6 grid gap-6">
          <Section title="GTM fit">
            {hasOutreachColumns(lead) && (
              <Field label="Industry" hint="Picks the outreach playbook: which question to ask and how to follow up.">
                <select className={selectClass} value={form.industry} onChange={(e) => set("industry", e.target.value)}>
                  <option value="">Not set</option>
                  {INDUSTRY_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {PLAYBOOKS[value].label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Segment">
                <select className={selectClass} value={form.segment} onChange={(e) => set("segment", e.target.value)}>
                  <option value="">Not set</option>
                  {SEGMENT_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {segmentLabels[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Employees" hint="Target: 10–100">
                <Input
                  type="number"
                  min={0}
                  value={form.employees}
                  onChange={(e) => set("employees", e.target.value)}
                />
              </Field>
              <Field label="Location">
                <Input
                  value={form.location}
                  placeholder="Trondheim"
                  onChange={(e) => set("location", e.target.value)}
                />
              </Field>
              <Field label="Org number">
                <Input
                  value={form.org_number}
                  placeholder="912 628 752"
                  onChange={(e) => set("org_number", e.target.value)}
                />
              </Field>
              <Field label="Website">
                <Input value={form.website} placeholder="https://" onChange={(e) => set("website", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Contact & opener">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" hint="Company addresses (post@, kontakt@) for cold outreach.">
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={form.email}
                  placeholder="post@company.no"
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={form.phone}
                  placeholder="+47 400 00 000"
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Best channel" hint="Email only to generic addresses (post@, kontakt@).">
              <select
                className={selectClass}
                value={form.best_channel}
                onChange={(e) => set("best_channel", e.target.value)}
              >
                <option value="">Not set</option>
                {BEST_CHANNEL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {bestChannelLabels[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Opener fact" hint="One specific, true fact about them — check it before sending.">
              <Textarea rows={3} value={form.opener_fact} onChange={(e) => set("opener_fact", e.target.value)} />
            </Field>
            <Field label="Opener source">
              <div className="flex items-center gap-2">
                <Input
                  value={form.opener_source}
                  placeholder="https://"
                  onChange={(e) => set("opener_source", e.target.value)}
                />
                {form.opener_source.startsWith("http") && (
                  <a
                    href={form.opener_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open source"
                    className="shrink-0 rounded-full p-2 text-ink-muted hover:bg-black/5 hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </Field>
          </Section>

          <Section title="Pipeline">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First contacted">
                <Input
                  type="date"
                  value={form.first_contacted_on}
                  onChange={(e) => set("first_contacted_on", e.target.value)}
                />
              </Field>
              {hasFollowUpColumns(lead) && (
                <Field label="Next follow-up" hint="Set automatically when you log a message; change it here.">
                  <Input
                    type="date"
                    value={form.next_follow_up_on}
                    onChange={(e) => set("next_follow_up_on", e.target.value)}
                  />
                </Field>
              )}
            </div>
            {hasFollowUpColumns(lead) && (
              <Field label="Next action">
                <Input
                  value={form.next_action}
                  placeholder="e.g. Call Thursday to book the discovery call"
                  onChange={(e) => set("next_action", e.target.value)}
                />
              </Field>
            )}
            {hasOutreachColumns(lead) && (
              <Field
                label="Deal value (NOK)"
                hint="Fill in when a pilot or project is signed — feeds Revenue on the dashboard."
              >
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.deal_value_nok}
                  onChange={(e) => set("deal_value_nok", e.target.value)}
                />
              </Field>
            )}
            {hasOutreachColumns(lead) && (
              <label className="flex items-start gap-3 rounded-xl border border-black/10 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={form.do_not_contact === "true"}
                  onChange={(e) => set("do_not_contact", e.target.checked ? "true" : "")}
                />
                <span>
                  <span className="font-medium">Do not contact</span>
                  <span className="block text-xs text-ink-muted">
                    They asked not to be contacted. Stops follow-ups and blocks sending.
                  </span>
                </span>
              </label>
            )}
            <p className="text-xs text-ink-muted">Discovery answers are recorded per call on the lead&apos;s page.</p>
          </Section>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={cn(buttonVariants({ variant: "primary" }), "w-full")}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save details"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
