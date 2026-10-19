"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { osloToday } from "@/lib/gtm-logic";
import { LeadDetailsDialog } from "@/components/admin/LeadDetailsDialog";
import type { PotentialCustomerDetails } from "@/lib/potential-customer-schema";
import {
  POTENTIAL_CUSTOMER_ATTITUDE_VALUES,
  POTENTIAL_CUSTOMER_STATUS_VALUES,
  WEEK_4_BAR_HOURS,
  accountingSystemLabels,
  bestChannelLabels,
  followUpDate,
  leadOpener,
  potentialCustomerAttitudeLabels,
  potentialCustomerStatusLabels,
  segmentLabels,
  type PotentialCustomer,
  type PotentialCustomerAttitude,
  type PotentialCustomerStatus,
} from "@/lib/potential-customer";

interface LeadProfileProps {
  lead: PotentialCustomer;
  onSetStatus: (id: string, status: string) => Promise<void>;
  onSetMessageSent: (id: string, messageSent: boolean) => Promise<void>;
  onSetCallMade: (id: string, callMade: boolean) => Promise<void>;
  onSetResponded: (id: string, responded: boolean) => Promise<void>;
  onSetAttitude: (id: string, attitude: string | null) => Promise<void>;
  onUpdateDetails: (id: string, details: PotentialCustomerDetails) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const selectClass =
  "h-10 w-full rounded-xl border border-black/10 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function formatDay(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? <span className="text-ink-muted">—</span>}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-black/10 pt-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{title}</p>
      <dl className="mt-2">{children}</dl>
    </div>
  );
}

function Toggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active ? "border-accent bg-accent/10 text-accent" : "border-black/10 text-ink-muted hover:border-black/25"
      )}
    >
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

/** Right-hand column of the lead page: pipeline controls, every GTM field, delete. */
export function LeadProfile({
  lead: serverLead,
  onSetStatus,
  onSetMessageSent,
  onSetCallMade,
  onSetResponded,
  onSetAttitude,
  onUpdateDetails,
  onDelete,
}: LeadProfileProps) {
  const router = useRouter();
  const [lead, setLead] = useState(serverLead);
  // Follow server refreshes (after Details or a sent message).
  const [syncedLead, setSyncedLead] = useState(serverLead);
  if (serverLead !== syncedLead) {
    setSyncedLead(serverLead);
    setLead(serverLead);
  }
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function update(patch: Partial<PotentialCustomer>, action: () => Promise<void>) {
    const previous = lead;
    setLead({ ...lead, ...patch });
    setError(null);
    try {
      await action();
    } catch {
      setLead(previous);
      setError("Couldn't save that change. Try again.");
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${lead.company || lead.name} from Potential customers? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(lead.id);
      router.push("/admin/marketing");
    } catch {
      setDeleting(false);
      setError("Couldn't delete this lead.");
    }
  }

  const today = osloToday();
  const due = followUpDate(lead);
  const opener = leadOpener(lead);

  return (
    <aside className="grid content-start gap-5 rounded-2xl border border-black/10 bg-card p-6">
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Status</span>
          <select
            className={selectClass}
            value={lead.status}
            onChange={(event) => {
              const status = event.target.value as PotentialCustomerStatus;
              void update({ status }, () => onSetStatus(lead.id, status));
            }}
          >
            {POTENTIAL_CUSTOMER_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {potentialCustomerStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <Toggle
            active={lead.message_sent}
            label={lead.message_sent ? "Message sent" : "No message yet"}
            onClick={() =>
              void update({ message_sent: !lead.message_sent }, () => onSetMessageSent(lead.id, !lead.message_sent))
            }
          />
          <Toggle
            active={lead.call_made}
            label={lead.call_made ? "Called" : "Not called"}
            onClick={() => void update({ call_made: !lead.call_made }, () => onSetCallMade(lead.id, !lead.call_made))}
          />
          <Toggle
            active={lead.responded}
            label={lead.responded ? "Responded" : "No response yet"}
            onClick={() => void update({ responded: !lead.responded }, () => onSetResponded(lead.id, !lead.responded))}
          />
        </div>

        {lead.responded && (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Attitude</span>
            <select
              className={selectClass}
              value={lead.attitude ?? ""}
              onChange={(event) => {
                const attitude = (event.target.value || null) as PotentialCustomerAttitude | null;
                void update({ attitude }, () => onSetAttitude(lead.id, attitude));
              }}
            >
              <option value="">Not set</option>
              {POTENTIAL_CUSTOMER_ATTITUDE_VALUES.map((attitude) => (
                <option key={attitude} value={attitude}>
                  {potentialCustomerAttitudeLabels[attitude]}
                </option>
              ))}
            </select>
          </label>
        )}

        {due && !lead.responded && (
          <p className={cn("text-sm", due < today ? "font-semibold text-danger" : "text-ink-muted")}>
            {due < today ? "Follow-up overdue" : due === today ? "Follow-up due today" : "Follow-up due"} ·{" "}
            {formatDay(due)}
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Lead details</p>
        <LeadDetailsDialog lead={lead} onSave={onUpdateDetails} />
      </div>

      <Group title="GTM fit">
        <Row label="Segment">{lead.segment && segmentLabels[lead.segment]}</Row>
        <Row label="Employees">{lead.employees}</Row>
        <Row label="Location">{lead.location}</Row>
        <Row label="Org number">{lead.org_number}</Row>
        <Row label="Source">{lead.source}</Row>
      </Group>

      <Group title="Contact">
        <Row label="Contact">{lead.name !== lead.company ? lead.name : null}</Row>
        <Row label="Best channel">{lead.best_channel && bestChannelLabels[lead.best_channel]}</Row>
        <Row label="Email">
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="hover:underline">
              {lead.email}
            </a>
          )}
        </Row>
        <Row label="Phone">
          {lead.phone && (
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="hover:underline">
              {lead.phone}
            </a>
          )}
        </Row>
        <Row label="Website">
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {lead.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </Row>
      </Group>

      <Group title="Opener">
        <Row label="Fact">{opener.fact}</Row>
        <Row label="Source">
          {opener.source && (
            <a
              href={opener.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              Check the source <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </Row>
      </Group>

      <Group title="Discovery">
        <Row label="Accounting">{lead.accounting_system && accountingSystemLabels[lead.accounting_system]}</Row>
        <Row label="Admin hours">
          {lead.admin_hours_per_week != null &&
            `${lead.admin_hours_per_week} h/week · ${
              lead.admin_hours_per_week >= WEEK_4_BAR_HOURS ? "meets the week-4 bar" : "below the week-4 bar"
            }`}
        </Row>
        <Row label="Main pain">{lead.main_pain}</Row>
      </Group>

      <Group title="Pipeline">
        <Row label="First contact">{lead.first_contacted_on && formatDay(lead.first_contacted_on)}</Row>
        <Row label="Added">{formatDay(lead.created_at.slice(0, 10))}</Row>
      </Group>

      <button
        type="button"
        onClick={() => void remove()}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 justify-self-start text-sm font-semibold text-ink-muted transition hover:text-danger disabled:opacity-60"
      >
        {deleting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        )}
        Delete lead
      </button>
    </aside>
  );
}

/** Notes, editable in full on the lead page (the table only shows one line). */
export function LeadNotes({
  leadId,
  notes,
  onSave,
}: {
  leadId: string;
  notes: string | null;
  onSave: (id: string, notes: string) => Promise<void>;
}) {
  const [value, setValue] = useState(notes ?? "");
  const [savedValue, setSavedValue] = useState(notes ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    if (value === savedValue) return;
    setState("saving");
    try {
      await onSave(leadId, value);
      setSavedValue(value);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Notes</h2>
        <span className={cn("text-xs", state === "error" ? "text-danger" : "text-ink-muted")}>
          {state === "saving"
            ? "Saving..."
            : state === "saved"
              ? "Saved"
              : state === "error"
                ? "Couldn't save"
                : "Saves when you click away"}
        </span>
      </div>
      <Textarea
        className="mt-4 leading-6"
        rows={10}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (state !== "saving") setState("idle");
        }}
        onBlur={() => void save()}
        placeholder="Call notes, what they said, next steps..."
      />
    </div>
  );
}
