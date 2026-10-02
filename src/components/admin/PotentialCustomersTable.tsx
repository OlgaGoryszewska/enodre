"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { potentialCustomerFormSchema, type PotentialCustomerFormValues } from "@/lib/potential-customer-schema";
import {
  POTENTIAL_CUSTOMER_STATUS_VALUES,
  potentialCustomerStatusLabels,
  type PotentialCustomer,
  type PotentialCustomerStatus,
} from "@/lib/potential-customer";

interface PotentialCustomersTableProps {
  leads: PotentialCustomer[];
  onAdd: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetStatus: (id: string, status: string) => Promise<void>;
  onUpdateNote: (id: string, notes: string) => Promise<void>;
}

const statusStyles: Record<PotentialCustomerStatus, string> = {
  new: "bg-black/5 text-ink-muted",
  contacted: "bg-accent/10 text-accent",
  interested: "bg-accent/15 text-accent",
  converted: "bg-[#EDE7FE] text-[#6C4CD6]",
  not_interested: "bg-black/5 text-ink-muted/60",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function NoteInput({ leadId, initialNote, onUpdateNote }: { leadId: string; initialNote: string | null; onUpdateNote: (id: string, notes: string) => Promise<void> }) {
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

export function PotentialCustomersTable({ leads: initialLeads, onAdd, onDelete, onSetStatus, onUpdateNote }: PotentialCustomersTableProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

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

  return (
    <div>
      <div className="flex items-center justify-end">
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

      {leads.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/20 p-10 text-center text-sm text-ink-muted">
          No potential customers yet.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-card text-xs uppercase tracking-widest text-ink-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
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
                        onChange={(event) => handleStatusChange(lead.id, event.target.value as PotentialCustomerStatus)}
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
                    <td className="px-5 py-4">
                      <NoteInput leadId={lead.id} initialNote={lead.notes} onUpdateNote={onUpdateNote} />
                    </td>
                    <td className="px-5 py-4 text-ink-muted">{formatDate(lead.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(lead.id)}
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
