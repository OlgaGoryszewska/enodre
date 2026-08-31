"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { customerFormSchema, type CustomerFormValues } from "@/lib/customer-schema";
import { customerRoleLabels, customerStatusLabels, type Customer } from "@/lib/customer";

interface CustomersTableProps {
  customers: Customer[];
  onAdd: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusStyles: Record<Customer["status"], string> = {
  lead: "bg-black/5 text-ink-muted",
  active: "bg-accent/15 text-accent",
  past: "bg-black/5 text-ink-muted/60",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CustomersTable({ customers: initialCustomers, onAdd, onDelete }: CustomersTableProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", email: "", phone: "", company: "" },
  });

  async function onSubmit(values: CustomerFormValues) {
    // Generated here (not left to the DB default) so the optimistic row
    // below links to a real /admin/people/[id] from the first paint.
    const id = crypto.randomUUID();

    const formData = new FormData();
    formData.set("id", id);
    formData.set("name", values.name);
    formData.set("email", values.email ?? "");
    formData.set("phone", values.phone ?? "");
    formData.set("company", values.company ?? "");
    await onAdd(formData);

    setCustomers((current) => [
      {
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        company: values.company || null,
        status: "lead",
        roles: [],
        notes: null,
      },
      ...current,
    ]);
    reset();
    setAddOpen(false);
  }

  async function handleDelete(id: string) {
    const previous = customers;
    setDeletingId(id);
    setCustomers((current) => current.filter((customer) => customer.id !== id));
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete customer:", error);
      setCustomers(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Add person"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/20 text-foreground transition hover:bg-foreground/5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </DialogTrigger>
          <DialogContent open={addOpen}>
            <DialogTitle className="text-lg font-semibold tracking-tight">Add person</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-muted">
              Just the basics — you can fill in more from their page.
            </DialogDescription>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
              <FormField id="customer-name" label="Name" required error={errors.name?.message}>
                <Input id="customer-name" placeholder="Jane Doe" {...register("name")} />
              </FormField>
              <FormField id="customer-email" label="Email" error={errors.email?.message}>
                <Input id="customer-email" type="email" placeholder="jane@acme.com" {...register("email")} />
              </FormField>
              <FormField id="customer-phone" label="Phone" error={errors.phone?.message}>
                <Input id="customer-phone" placeholder="+1 555 000 0000" {...register("phone")} />
              </FormField>
              <FormField id="customer-company" label="Company" error={errors.company?.message}>
                <Input id="customer-company" placeholder="Acme Inc." {...register("company")} />
              </FormField>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(buttonVariants({ variant: "primary" }), "mt-1 w-full")}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  "Add person"
                )}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/20 p-10 text-center text-sm text-ink-muted">
          No people yet.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-card text-xs uppercase tracking-widest text-ink-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Roles</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                  <th className="px-5 py-3 font-medium">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-black/10 last:border-b-0 hover:bg-card">
                    <td className="px-5 py-4">
                      <Link href={`/admin/people/${customer.id}`} className="font-semibold hover:underline">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {customer.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {customer.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-flex rounded-full bg-black/5 px-2 py-0.5 text-xs text-ink-muted"
                            >
                              {customerRoleLabels[role]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-ink-muted">{customer.company || "—"}</td>
                    <td className="px-5 py-4 text-ink-muted">{customer.email || "—"}</td>
                    <td className="px-5 py-4 text-ink-muted">{customer.phone || "—"}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                          statusStyles[customer.status]
                        )}
                      >
                        {customerStatusLabels[customer.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-muted">{formatDate(customer.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(customer.id)}
                        disabled={deletingId === customer.id}
                        aria-label={`Remove ${customer.name}`}
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
