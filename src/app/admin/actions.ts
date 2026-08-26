"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { STATUS_VALUES, type ContactStatus } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";

export async function updateContactStatus(id: string, formData: FormData) {
  const status = formData.get("status");

  if (typeof status !== "string" || !STATUS_VALUES.includes(status as ContactStatus)) {
    throw new Error("Invalid status.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin", "layout");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
