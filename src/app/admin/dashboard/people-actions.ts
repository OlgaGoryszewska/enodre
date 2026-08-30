"use server";

import { revalidatePath } from "next/cache";
import { inspiringPersonFormSchema } from "@/lib/inspiring-person-schema";
import { createClient } from "@/lib/supabase/server";

const TABLE = "inspiring_people";

export async function addInspiringPerson(formData: FormData) {
  const values = inspiringPersonFormSchema.parse({
    name: formData.get("name"),
    reason: formData.get("reason") || undefined,
    url: formData.get("url") || undefined,
  });

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({
    name: values.name,
    reason: values.reason || null,
    url: values.url || null,
  });

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function deleteInspiringPerson(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function updateInspiringPersonReason(id: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ reason: reason || null })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}
