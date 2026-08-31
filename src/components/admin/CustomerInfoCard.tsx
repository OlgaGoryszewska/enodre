"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import {
  CUSTOMER_ROLE_VALUES,
  CUSTOMER_STATUS_VALUES,
  customerRoleLabels,
  customerStatusLabels,
  type Customer,
} from "@/lib/customer";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/challenge/FormField";

interface CustomerInfoCardProps {
  customer: Customer;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CustomerInfoCard({ customer, onUpdate, onDelete }: CustomerInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  // A successful save re-renders this component with a fresh customer prop
  // (new updated_at) — drop back to view mode when that happens, same
  // "adjusting state during render" pattern used for Calendar.tsx's events.
  const [prevUpdatedAt, setPrevUpdatedAt] = useState(customer.updated_at);
  if (customer.updated_at !== prevUpdatedAt) {
    setPrevUpdatedAt(customer.updated_at);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="h-fit rounded-2xl border border-black/10 bg-card p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Edit person</h2>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            aria-label="Cancel"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-black/5 hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form action={onUpdate} className="mt-6 grid gap-4">
          <FormField id="edit-name" label="Name" required>
            <Input id="edit-name" name="name" defaultValue={customer.name} />
          </FormField>
          <FormField id="edit-email" label="Email">
            <Input id="edit-email" name="email" type="email" defaultValue={customer.email ?? ""} />
          </FormField>
          <FormField id="edit-phone" label="Phone">
            <Input id="edit-phone" name="phone" defaultValue={customer.phone ?? ""} />
          </FormField>
          <FormField id="edit-company" label="Company">
            <Input id="edit-company" name="company" defaultValue={customer.company ?? ""} />
          </FormField>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium leading-none text-foreground">
              Roles <span className="text-xs font-normal text-ink-muted">(pick any that apply)</span>
            </legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {CUSTOMER_ROLE_VALUES.map((role) => (
                <label
                  key={role}
                  htmlFor={`role-${role}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    customer.roles.includes(role)
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-black/10 text-ink-muted hover:border-black/25"
                  )}
                >
                  <input
                    id={`role-${role}`}
                    type="checkbox"
                    name="roles"
                    value={role}
                    defaultChecked={customer.roles.includes(role)}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  {customerRoleLabels[role]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium leading-none text-foreground">Status</legend>
            <div className="mt-1 grid gap-2">
              {CUSTOMER_STATUS_VALUES.map((status) => (
                <label
                  key={status}
                  htmlFor={`status-${status}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors duration-150",
                    customer.status === status
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-black/10 text-ink-muted hover:border-black/25 hover:text-foreground"
                  )}
                >
                  <input
                    id={`status-${status}`}
                    type="radio"
                    name="status"
                    value={status}
                    defaultChecked={customer.status === status}
                    className="h-4 w-4 accent-accent"
                  />
                  {customerStatusLabels[status]}
                </label>
              ))}
            </div>
          </fieldset>

          <FormField id="edit-notes" label="Notes">
            <Textarea id="edit-notes" name="notes" rows={4} defaultValue={customer.notes ?? ""} />
          </FormField>

          <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "mt-2 w-full")}>
            Save changes
          </button>
        </form>

        <form action={onDelete} className="mt-4">
          <button
            type="submit"
            className="w-full text-center text-sm font-semibold text-ink-muted transition hover:text-danger"
          >
            Delete person
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-fit rounded-2xl border border-black/10 bg-card p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{customerStatusLabels[customer.status]}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{customer.name}</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label="Edit person"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 text-foreground transition hover:bg-foreground/5"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {customer.roles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {customer.roles.map((role) => (
            <span
              key={role}
              className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
            >
              {customerRoleLabels[role]}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-1 text-sm text-ink-muted">
        {customer.email && <p>{customer.email}</p>}
        {customer.phone && <p>{customer.phone}</p>}
        {customer.company && <p>{customer.company}</p>}
        {!customer.email && !customer.phone && !customer.company && <p>No contact details yet.</p>}
      </div>

      {customer.notes && (
        <div className="mt-6 border-t border-black/10 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{customer.notes}</p>
        </div>
      )}

      <p className="mt-6 text-xs text-ink-muted">
        Added {formatDateTime(customer.created_at)} · Updated {formatDateTime(customer.updated_at)}
      </p>
    </div>
  );
}
