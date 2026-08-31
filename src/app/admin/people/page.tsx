import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { addCustomer, deleteCustomer } from "@/app/admin/customers/actions";
import type { Customer } from "@/lib/customer";

export const metadata: Metadata = {
  title: "Customers",
  description: "Admin customers.",
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

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Customers</h1>
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
