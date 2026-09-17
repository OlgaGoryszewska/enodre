import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { MentorsSection } from "@/components/admin/MentorsSection";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { addCustomer, deleteCustomer } from "@/app/admin/people/actions";
import type { Customer } from "@/lib/customer";

export const metadata: Metadata = {
  title: "People",
  description: "Admin people.",
};

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load customers:", error);
  }

  const customers = (data ?? []) as Customer[];
  const mentors = customers.filter((customer) => customer.roles.includes("mentor_advisor"));

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <h1 className="page-title text-2xl">People</h1>
      </div>

      <div className="mt-10">
        <MentorsSection mentors={mentors} />
      </div>

      <div className="mt-10">
        <CustomersTable customers={customers} onAdd={addCustomer} onDelete={deleteCustomer} />
      </div>

      <div className="mt-16">
        <SignOutButton />
      </div>
    </section>
  );
}
