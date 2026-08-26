import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { ContactsTable } from "@/components/admin/ContactsTable";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/admin/actions";
import type { Contact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Admin",
  description: "Contact submissions.",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load contacts:", error);
  }

  const contacts = (data ?? []) as Contact[];

  return (
    <section className="shell py-20 sm:py-28">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <AdminNav />
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-semibold text-ink-muted transition hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="page-title mt-4 text-4xl">Contact submissions</h1>
        </div>
      </div>

      <div className="mt-10">
        <ContactsTable contacts={contacts} />
      </div>
    </section>
  );
}
