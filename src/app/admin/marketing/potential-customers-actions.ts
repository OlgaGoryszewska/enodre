"use server";

import { revalidatePath } from "next/cache";
import { potentialCustomerFormSchema } from "@/lib/potential-customer-schema";
import {
  POTENTIAL_CUSTOMER_STATUS_VALUES,
  POTENTIAL_CUSTOMER_ATTITUDE_VALUES,
  type PotentialCustomerStatus,
  type PotentialCustomerAttitude,
} from "@/lib/potential-customer";
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

export async function setPotentialCustomerMessageSent(id: string, messageSent: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ message_sent: messageSent, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing");
}

export async function setPotentialCustomerCallMade(id: string, callMade: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ call_made: callMade, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing");
}

export async function setPotentialCustomerResponded(id: string, responded: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ responded, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing");
}

export async function setPotentialCustomerAttitude(id: string, attitude: string | null) {
  if (attitude !== null && !POTENTIAL_CUSTOMER_ATTITUDE_VALUES.includes(attitude as PotentialCustomerAttitude)) {
    throw new Error("Invalid attitude.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ attitude, updated_at: new Date().toISOString() })
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
