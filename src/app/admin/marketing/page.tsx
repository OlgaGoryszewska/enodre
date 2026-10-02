import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import Link from "next/link";
import { PotentialCustomersTable } from "@/components/admin/PotentialCustomersTable";
import { MarketingKanbanBoard } from "@/components/admin/MarketingKanbanBoard";
import { ContactsTable } from "@/components/admin/ContactsTable";
import { CustomerFilesSection } from "@/components/admin/CustomerFilesSection";
import { StickyNotesBoard } from "@/components/admin/StickyNotesBoard";
import { createClient } from "@/lib/supabase/server";
import {
  addPotentialCustomer,
  deletePotentialCustomer,
  setPotentialCustomerStatus,
  setPotentialCustomerMessageSent,
  setPotentialCustomerCallMade,
  setPotentialCustomerResponded,
  setPotentialCustomerAttitude,
  updatePotentialCustomerNote,
} from "@/app/admin/marketing/potential-customers-actions";
import { BUSINESS_PROFILE_NAME } from "@/lib/business-profile";
import type { PotentialCustomer } from "@/lib/potential-customer";
import type { MarketingTask } from "@/lib/marketing-task";
import type { CustomerFile, CustomerFileWithUrl } from "@/lib/customer-file";
import type { StickyNote } from "@/lib/customer-sticky-note";
import type { Contact } from "@/lib/contact";

const BUCKET = "customer-files";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export const metadata: Metadata = {
  title: "Business Plan & Marketing Strategy",
  description: "Potential customers, marketing kanban, and strategy notes.",
};

async function getOrCreateBusinessProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data: existing, error: findError } = await supabase
    .from("customers")
    .select("id")
    .eq("name", BUSINESS_PROFILE_NAME)
    .maybeSingle();

  if (findError) {
    console.error("Failed to look up the business profile row:", findError);
    return null;
  }
  if (existing) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("customers")
    .insert({ name: BUSINESS_PROFILE_NAME, status: "active", roles: [] })
    .select("id")
    .single();

  if (createError) {
    console.error("Failed to create the business profile row:", createError);
    return null;
  }
  return created.id as string;
}

export default async function MarketingPage() {
  const supabase = await createClient();

  const businessProfileId = await getOrCreateBusinessProfileId(supabase);

  const [
    { data: leadsData, error: leadsError },
    { data: inboundData, error: inboundError },
    { data: marketingTasksData, error: marketingTasksError },
    { data: filesData, error: filesError },
    { data: notesData, error: notesError },
  ] = await Promise.all([
    supabase.from("potential_customers").select("*").order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").order("created_at", { ascending: false }),
    supabase.from("marketing_tasks").select("*").order("position", { ascending: true }),
    businessProfileId
      ? supabase.from("customer_files").select("*").eq("customer_id", businessProfileId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    businessProfileId
      ? supabase.from("customer_sticky_notes").select("*").eq("customer_id", businessProfileId).order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (leadsError) {
    console.error("Failed to load potential customers:", leadsError);
  }
  if (inboundError) {
    console.error("Failed to load inbound contacts:", inboundError);
  }
  if (marketingTasksError) {
    console.error("Failed to load marketing tasks:", marketingTasksError);
  }
  if (filesError) {
    console.error("Failed to load marketing files:", filesError);
  }
  if (notesError) {
    console.error("Failed to load marketing sticky notes:", notesError);
  }

  const leads = (leadsData ?? []) as PotentialCustomer[];
  const inboundContacts = (inboundData ?? []) as Contact[];
  const marketingTasks = (marketingTasksData ?? []) as MarketingTask[];
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
      (signed ?? []).filter((entry) => entry.signedUrl).map((entry) => [entry.path ?? "", entry.signedUrl as string])
    );
  }
  const filesWithUrls: CustomerFileWithUrl[] = files.map((file) => ({
    ...file,
    signedUrl: signedUrlByPath.get(file.storage_path) ?? null,
  }));

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <h1 className="page-title text-2xl">Business Plan & Marketing Strategy</h1>
      </div>

      <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">Leads pipeline</h2>
        <p className="mt-1 text-sm text-ink-muted">A separate list from People, not a filtered view of it.</p>
        <div className="mt-6">
          <PotentialCustomersTable
            leads={leads}
            onAdd={addPotentialCustomer}
            onDelete={deletePotentialCustomer}
            onSetStatus={setPotentialCustomerStatus}
            onSetMessageSent={setPotentialCustomerMessageSent}
            onSetCallMade={setPotentialCustomerCallMade}
            onSetResponded={setPotentialCustomerResponded}
            onSetAttitude={setPotentialCustomerAttitude}
            onUpdateNote={updatePotentialCustomerNote}
          />
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Customers who reached us</h2>
            <p className="mt-1 text-sm text-ink-muted">Inbound — submitted the site's contact form, rather than us reaching out.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-accent hover:underline">
            Open full inbox →
          </Link>
        </div>
        <div className="mt-6">
          <ContactsTable contacts={inboundContacts} />
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
        <MarketingKanbanBoard initialTasks={marketingTasks} />
      </div>

      {businessProfileId && (
        <>
          <CustomerFilesSection customerId={businessProfileId} initialFiles={filesWithUrls} />
          <StickyNotesBoard customerId={businessProfileId} initialNotes={stickyNotes} />
        </>
      )}

      <div className="mt-16">
        <p className="text-xs text-ink-muted">
          Files and sticky notes here are stored the same way as on a person's profile, just scoped to Enodre itself
          instead of a specific contact.
        </p>
      </div>
    </section>
  );
}
