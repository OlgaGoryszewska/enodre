import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CUSTOMER_STATUS_VALUES, customerStatusLabels, type Customer } from "@/lib/customer";
import type { CustomerFile, CustomerFileWithUrl } from "@/lib/customer-file";
import type { StickyNote } from "@/lib/customer-sticky-note";
import { createClient } from "@/lib/supabase/server";
import { updateCustomer, deleteCustomer } from "@/app/admin/customers/actions";
import { CustomerFilesSection } from "@/components/admin/CustomerFilesSection";
import { StickyNotesBoard } from "@/components/admin/StickyNotesBoard";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/challenge/FormField";

const BUCKET = "customer-files";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

type CustomerPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Customer",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: customerData, error: customerError },
    { data: filesData, error: filesError },
    { data: notesData, error: notesError },
  ] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("customer_files").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase
      .from("customer_sticky_notes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (customerError) {
    console.error("Failed to load customer:", customerError);
  }
  if (filesError) {
    console.error("Failed to load customer files:", filesError);
  }
  if (notesError) {
    console.error("Failed to load sticky notes:", notesError);
  }

  if (!customerData) notFound();

  const customer = customerData as Customer;
  const files = (filesData ?? []) as CustomerFile[];
  const stickyNotes = (notesData ?? []) as StickyNote[];

  let signedUrlByPath = new Map<string, string>();
  if (files.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(
        files.map((file) => file.storage_path),
        SIGNED_URL_TTL_SECONDS
      );
    signedUrlByPath = new Map(
      (signed ?? [])
        .filter((entry) => entry.signedUrl)
        .map((entry) => [entry.path ?? "", entry.signedUrl as string])
    );
  }
  const filesWithUrls: CustomerFileWithUrl[] = files.map((file) => ({
    ...file,
    signedUrl: signedUrlByPath.get(file.storage_path) ?? null,
  }));

  const updateAction = updateCustomer.bind(null, id);
  const deleteAction = deleteCustomer.bind(null, id);

  return (
    <section className="shell py-20 sm:py-28">
      <Link href="/admin/customers" className="text-sm font-semibold text-ink-muted hover:text-foreground">
        ← All customers
      </Link>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="eyebrow">{customerStatusLabels[customer.status]}</p>
          <h1 className="page-title mt-4 text-4xl">{customer.name}</h1>
          <p className="mt-2 text-ink-muted">
            {customer.email}
            {customer.company && ` · ${customer.company}`}
            {customer.phone && ` · ${customer.phone}`}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Added {formatDateTime(customer.created_at)} · Updated {formatDateTime(customer.updated_at)}
          </p>

          {customer.notes && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">Notes</h2>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-foreground">{customer.notes}</p>
            </div>
          )}

          <CustomerFilesSection customerId={customer.id} initialFiles={filesWithUrls} />
          <StickyNotesBoard customerId={customer.id} initialNotes={stickyNotes} />
        </div>

        <aside className="h-fit rounded-2xl border border-black/10 bg-card p-8">
          <h2 className="font-semibold">Edit customer</h2>
          <form action={updateAction} className="mt-6 grid gap-4">
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

          <form action={deleteAction} className="mt-4">
            <button
              type="submit"
              className="w-full text-center text-sm font-semibold text-ink-muted transition hover:text-danger"
            >
              Delete customer
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}
