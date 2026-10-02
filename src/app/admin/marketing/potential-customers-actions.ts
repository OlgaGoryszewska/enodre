"use server";

import { revalidatePath } from "next/cache";
import { potentialCustomerFormSchema } from "@/lib/potential-customer-schema";
import { POTENTIAL_CUSTOMER_STATUS_VALUES, type PotentialCustomerStatus } from "@/lib/potential-customer";
import { createClient } from "@/lib/supabase/server";

const TABLE = "potential_customers";

export async function addPotentialCustomer(formData: FormData) {
  const values = potentialCustomerFormSchema.parse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    source: formData.get("source") || undefined,
  });

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({
    name: values.name,
    company: values.company || null,
    email: values.email || null,
    phone: values.phone || null,
    source: values.source || null,
    status: "new",
  });

  if (error) throw error;

  revalidatePath("/admin/marketing");
}

export async function setPotentialCustomerStatus(id: string, status: string) {
  if (!POTENTIAL_CUSTOMER_STATUS_VALUES.includes(status as PotentialCustomerStatus)) {
    throw new Error("Invalid status.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing");
}

export async function updatePotentialCustomerNote(id: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing");
}

export async function deletePotentialCustomer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing");
}
