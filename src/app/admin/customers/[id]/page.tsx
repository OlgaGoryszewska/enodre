import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Customer } from "@/lib/customer";
import type { CustomerFile, CustomerFileWithUrl } from "@/lib/customer-file";
import type { StickyNote } from "@/lib/customer-sticky-note";
import type { CustomerJournalEntry } from "@/lib/customer-journal";
import { createClient } from "@/lib/supabase/server";
import { updateCustomer, deleteCustomer } from "@/app/admin/customers/actions";
import { CustomerInfoCard } from "@/components/admin/CustomerInfoCard";
import { CustomerFilesSection } from "@/components/admin/CustomerFilesSection";
import { StickyNotesBoard } from "@/components/admin/StickyNotesBoard";
import { CustomerJournal } from "@/components/admin/CustomerJournal";

const BUCKET = "customer-files";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

type CustomerPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Customer",
};

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: customerData, error: customerError },
    { data: filesData, error: filesError },
    { data: notesData, error: notesError },
    { data: journalData, error: journalError },
  ] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("customer_files").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase
      .from("customer_sticky_notes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_journal_entries")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
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
  if (journalError) {
    console.error("Failed to load journal entries:", journalError);
  }

  if (!customerData) notFound();

  const customer = customerData as Customer;
  const files = (filesData ?? []) as CustomerFile[];
  const stickyNotes = (notesData ?? []) as StickyNote[];
  const journalEntries = (journalData ?? []) as CustomerJournalEntry[];

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
          <CustomerJournal customerId={customer.id} initialEntries={journalEntries} />
          <CustomerFilesSection customerId={customer.id} initialFiles={filesWithUrls} />
          <StickyNotesBoard customerId={customer.id} initialNotes={stickyNotes} />
        </div>

        <CustomerInfoCard customer={customer} onUpdate={updateAction} onDelete={deleteAction} />
      </div>
    </section>
  );
}
