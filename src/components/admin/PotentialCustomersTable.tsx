"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { potentialCustomerFormSchema, type PotentialCustomerFormValues } from "@/lib/potential-customer-schema";
import {
  POTENTIAL_CUSTOMER_STATUS_VALUES,
  potentialCustomerStatusLabels,
  POTENTIAL_CUSTOMER_ATTITUDE_VALUES,
  potentialCustomerAttitudeLabels,
  type PotentialCustomer,
  type PotentialCustomerStatus,
  type PotentialCustomerAttitude,
} from "@/lib/potential-customer";

interface PotentialCustomersTableProps {
  leads: PotentialCustomer[];
  onAdd: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetStatus: (id: string, status: string) => Promise<void>;
  onSetMessageSent: (id: string, messageSent: boolean) => Promise<void>;
  onSetCallMade: (id: string, callMade: boolean) => Promise<void>;
  onSetResponded: (id: string, responded: boolean) => Promise<void>;
  onSetAttitude: (id: string, attitude: string | null) => Promise<void>;
  onUpdateNote: (id: string, notes: string) => Promise<void>;
}

type TriFilter = "all" | "yes" | "no";

function ToggleButton({
  active,
  activeLabel,
  inactiveLabel,
  onClick,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition",
        active ? "border-accent bg-accent/10 text-accent" : "border-black/10 text-ink-muted hover:border-black/25"
      )}
    >
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

const statusStyles: Record<PotentialCustomerStatus, string> = {
  new: "bg-black/5 text-ink-muted",
  contacted: "bg-accent/10 text-accent",
  interested: "bg-accent/15 text-accent",
  converted: "bg-[#EDE7FE] text-[#6C4CD6]",
  not_interested: "bg-black/5 text-ink-muted/60",
};

const attitudeStyles: Record<PotentialCustomerAttitude, string> = {
  positive: "bg-[#E3F3E6] text-[#1B8A3A]",
  neutral: "bg-black/5 text-ink-muted",
  negative: "bg-[#FBE7E9] text-danger",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function NoteInput({
  leadId,
  initialNote,
  onUpdateNote,
}: {
  leadId: string;
  initialNote: string | null;
  onUpdateNote: (id: string, notes: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (value === (initialNote ?? "")) return;
    setSaving(true);
    try {
      await onUpdateNote(leadId, value);
    } catch (error) {
      console.error("Failed to save lead note:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={handleBlur}
      disabled={saving}
      placeholder="Note..."
      className="w-full min-w-[140px] rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink-muted transition placeholder:text-ink-muted/60 hover:border-black/10 focus:border-black/15 focus:bg-background focus:outline-none disabled:opacity-60"
    />
  );
}

interface LeadsTableProps {
  title: string;
  subtitle: string;
  leads: PotentialCustomer[];
  emptyLabel: string;
  showAttitude: boolean;
  respondedToggleLabels: { active: string; inactive: string };
  onStatusChange: (id: string, status: PotentialCustomerStatus) => void;
  onAttitudeChange: (id: string, attitude: PotentialCustomerAttitude | null) => void;
  onToggleMessageSent: (id: string, value: boolean) => void;
  onToggleCallMade: (id: string, value: boolean) => void;
  onToggleResponded: (id: string, value: boolean) => void;
  onUpdateNote: (id: string, notes: string) => Promise<void>;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

function LeadsTable({
  title,
  subtitle,
  leads,
  emptyLabel,
  showAttitude,
  respondedToggleLabels,
  onStatusChange,
  onAttitudeChange,
  onToggleMessageSent,
  onToggleCallMade,
  onToggleResponded,
  onUpdateNote,
  onDelete,
  deletingId,
}: LeadsTableProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

      {leads.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-black/20 p-8 text-center text-sm text-ink-muted">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className={cn("w-full border-collapse text-left text-sm", showAttitude ? "min-w-[1180px]" : "min-w-[1020px]")}>
              <thead>
                <tr className="border-b border-black/10 bg-card text-xs uppercase tracking-widest text-ink-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  {showAttitude && <th className="px-5 py-3 font-medium">Attitude</th>}
                  <th className="px-5 py-3 font-medium">Message</th>
                  <th className="px-5 py-3 font-medium">Call</th>
                  <th className="px-5 py-3 font-medium">Responded</th>
                  <th className="px-5 py-3 font-medium">Note</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                  <th className="px-5 py-3 font-medium">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-black/10 last:border-b-0 hover:bg-card">
                    <td className="px-5 py-4 font-semibold">{lead.name}</td>
                    <td className="px-5 py-4 text-ink-muted">{lead.company || "—"}</td>
                    <td className="px-5 py-4 text-ink-muted">{lead.email || "—"}</td>
                    <td className="px-5 py-4 text-ink-muted">{lead.phone || "—"}</td>
                    <td className="px-5 py-4 text-ink-muted">{lead.source || "—"}</td>
                    <td className="px-5 py-4">
                      <select
                        value={lead.status}
                        onChange={(event) => onStatusChange(lead.id, event.target.value as PotentialCustomerStatus)}
                        className={cn(
                          "rounded-full border-none px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40",
                          statusStyles[lead.status]
                        )}
                      >
                        {POTENTIAL_CUSTOMER_STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {potentialCustomerStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    {showAttitude && (
                      <td className="px-5 py-4">
                        <select
                          value={lead.attitude ?? ""}
                          onChange={(event) =>
                            onAttitudeChange(lead.id, (event.target.value || null) as PotentialCustomerAttitude | null)
                          }
                          className={cn(
                            "rounded-full border-none px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40",
                            lead.attitude ? attitudeStyles[lead.attitude] : "bg-black/5 text-ink-muted"
                          )}
                        >
                          <option value="">Not set</option>
                          {POTENTIAL_CUSTOMER_ATTITUDE_VALUES.map((attitude) => (
                            <option key={attitude} value={attitude}>
                              {potentialCustomerAttitudeLabels[attitude]}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <ToggleButton
                        active={lead.message_sent}
                        activeLabel="Sent"
                        inactiveLabel="Not sent"
                        onClick={() => onToggleMessageSent(lead.id, !lead.message_sent)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <ToggleButton
                        active={lead.call_made}
                        activeLabel="Called"
                        inactiveLabel="Not called"
                        onClick={() => onToggleCallMade(lead.id, !lead.call_made)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <ToggleButton
                        active={lead.responded}
                        activeLabel={respondedToggleLabels.active}
                        inactiveLabel={respondedToggleLabels.inactive}
                        onClick={() => onToggleResponded(lead.id, !lead.responded)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <NoteInput leadId={lead.id} initialNote={lead.notes} onUpdateNote={onUpdateNote} />
                    </td>
                    <td className="px-5 py-4 text-ink-muted">{formatDate(lead.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(lead.id)}
                        disabled={deletingId === lead.id}
                        aria-label={`Remove ${lead.name}`}
                        className="text-ink-muted transition hover:text-danger disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function PotentialCustomersTable({
  leads: initialLeads,
  onAdd,
  onDelete,
  onSetStatus,
  onSetMessageSent,
  onSetCallMade,
  onSetResponded,
  onSetAttitude,
  onUpdateNote,
}: PotentialCustomersTableProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<PotentialCustomerStatus | "all">("all");
  const [messageFilter, setMessageFilter] = useState<TriFilter>("all");
  const [callFilter, setCallFilter] = useState<TriFilter>("all");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PotentialCustomerFormValues>({
    resolver: zodResolver(potentialCustomerFormSchema),
    defaultValues: { name: "", company: "", email: "", phone: "", source: "" },
  });

  async function onSubmit(values: PotentialCustomerFormValues) {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("company", values.company ?? "");
    formData.set("email", values.email ?? "");
    formData.set("phone", values.phone ?? "");
    formData.set("source", values.source ?? "");
    await onAdd(formData);

    setLeads((current) => [
      {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        name: values.name,
        company: values.company || null,
        email: values.email || null,
        phone: values.phone || null,
        source: values.source || null,
        status: "new",
        message_sent: false,
        call_made: false,
        responded: false,
        attitude: null,
        notes: null,
      },
      ...current,
    ]);
    reset();
    setAddOpen(false);
  }

  async function handleDelete(id: string) {
    const previous = leads;
    setDeletingId(id);
    setLeads((current) => current.filter((lead) => lead.id !== id));
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete lead:", error);
      setLeads(previous);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusChange(id: string, status: PotentialCustomerStatus) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
    try {
      await onSetStatus(id, status);
    } catch (error) {
      console.error("Failed to update lead status:", error);
      setLeads(previous);
    }
  }

  async function handleAttitudeChange(id: string, attitude: PotentialCustomerAttitude | null) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, attitude } : lead)));
    try {
      await onSetAttitude(id, attitude);
    } catch (error) {
      console.error("Failed to update lead attitude:", error);
      setLeads(previous);
    }
  }

  async function handleToggleMessageSent(id: string, messageSent: boolean) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, message_sent: messageSent } : lead)));
    try {
      await onSetMessageSent(id, messageSent);
    } catch (error) {
      console.error("Failed to update message-sent status:", error);
      setLeads(previous);
    }
  }

  async function handleToggleCallMade(id: string, callMade: boolean) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, call_made: callMade } : lead)));
    try {
      await onSetCallMade(id, callMade);
    } catch (error) {
      console.error("Failed to update call-made status:", error);
      setLeads(previous);
    }
  }

  async function handleToggleResponded(id: string, responded: boolean) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, responded } : lead)));
    try {
      await onSetResponded(id, responded);
    } catch (error) {
      console.error("Failed to update responded status:", error);
      setLeads(previous);
    }
  }

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (statusFilter !== "all" && lead.status !== statusFilter) return false;
        if (messageFilter === "yes" && !lead.message_sent) return false;
        if (messageFilter === "no" && lead.message_sent) return false;
        if (callFilter === "yes" && !lead.call_made) return false;
        if (callFilter === "no" && lead.call_made) return false;
        return true;
      }),
    [leads, statusFilter, messageFilter, callFilter]
  );

  const pendingLeads = filteredLeads.filter((lead) => !lead.responded);
  const respondedLeads = filteredLeads.filter((lead) => lead.responded);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as PotentialCustomerStatus | "all")}
            className="rounded-full border border-black/10 bg-background px-3 py-1.5 text-xs font-semibold text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="all">All statuses</option>
            {POTENTIAL_CUSTOMER_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {potentialCustomerStatusLabels[status]}
              </option>
            ))}
          </select>
          <select
            value={messageFilter}
            onChange={(event) => setMessageFilter(event.target.value as TriFilter)}
            className="rounded-full border border-black/10 bg-background px-3 py-1.5 text-xs font-semibold text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="all">Message: all</option>
            <option value="yes">Message: sent</option>
            <option value="no">Message: not sent</option>
          </select>
          <select
            value={callFilter}
            onChange={(event) => setCallFilter(event.target.value as TriFilter)}
            className="rounded-full border border-black/10 bg-background px-3 py-1.5 text-xs font-semibold text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="all">Call: all</option>
            <option value="yes">Call: made</option>
            <option value="no">Call: not made</option>
          </select>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Add potential customer"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/20 text-foreground transition hover:bg-foreground/5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </DialogTrigger>
          <DialogContent open={addOpen}>
            <DialogTitle className="text-lg font-semibold tracking-tight">Add potential customer</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-muted">A lead worth tracking.</DialogDescription>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
              <FormField id="lead-name" label="Name" required error={errors.name?.message}>
                <Input id="lead-name" placeholder="Jane Doe" {...register("name")} />
              </FormField>
              <FormField id="lead-company" label="Company" error={errors.company?.message}>
                <Input id="lead-company" placeholder="Acme Inc." {...register("company")} />
              </FormField>
              <FormField id="lead-email" label="Email" error={errors.email?.message}>
                <Input id="lead-email" type="email" placeholder="jane@acme.com" {...register("email")} />
              </FormField>
              <FormField id="lead-phone" label="Phone" error={errors.phone?.message}>
                <Input id="lead-phone" placeholder="+1 555 000 0000" {...register("phone")} />
              </FormField>
              <FormField id="lead-source" label="Source" error={errors.source?.message}>
                <Input id="lead-source" placeholder="LinkedIn, referral, cold outreach..." {...register("source")} />
              </FormField>

              <button type="submit" disabled={isSubmitting} className={cn(buttonVariants({ variant: "primary" }), "mt-1 w-full")}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Add potential customer"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6">
        <LeadsTable
          title="Potential customers"
          subtitle="Leads you're pursuing, not yet responded."
          leads={pendingLeads}
          emptyLabel="No potential customers match these filters."
          showAttitude={false}
          respondedToggleLabels={{ active: "Responded", inactive: "No response yet" }}
          onStatusChange={handleStatusChange}
          onAttitudeChange={handleAttitudeChange}
          onToggleMessageSent={handleToggleMessageSent}
          onToggleCallMade={handleToggleCallMade}
          onToggleResponded={handleToggleResponded}
          onUpdateNote={onUpdateNote}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      </div>

      <div className="mt-10">
        <LeadsTable
          title="Contacted customers with response"
          subtitle="Phase 2 — they've responded. Attitude tracks how the conversation is going."
          leads={respondedLeads}
          emptyLabel="No one here yet — mark a lead as responded once they reply."
          showAttitude
          respondedToggleLabels={{ active: "Responded", inactive: "Move back" }}
          onStatusChange={handleStatusChange}
          onAttitudeChange={handleAttitudeChange}
          onToggleMessageSent={handleToggleMessageSent}
          onToggleCallMade={handleToggleCallMade}
          onToggleResponded={handleToggleResponded}
          onUpdateNote={onUpdateNote}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      </div>
    </div>
  );
}
