"use server";

import { revalidatePath } from "next/cache";
import { marketingTaskFormSchema } from "@/lib/marketing-task-schema";
import { MARKETING_TASK_STATUS_VALUES, type MarketingTaskStatus } from "@/lib/marketing-task";
import { createClient } from "@/lib/supabase/server";

function parseForm(formData: FormData) {
  return marketingTaskFormSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
}

export async function createMarketingTask(status: string, formData: FormData) {
  if (!MARKETING_TASK_STATUS_VALUES.includes(status as MarketingTaskStatus)) {
    throw new Error("Invalid status.");
  }

  const values = parseForm(formData);
  const supabase = await createClient();

  const { count } = await supabase
    .from("marketing_tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  const { error } = await supabase.from("marketing_tasks").insert({
    title: values.title,
    description: values.description || null,
    status,
    position: count ?? 0,
  });

  if (error) throw error;

  revalidatePath("/admin/marketing");
}

export async function updateMarketingTask(id: string, formData: FormData) {
  const values = parseForm(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("marketing_tasks")
    .update({
      title: values.title,
      description: values.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing");
}

export async function deleteMarketingTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_tasks").delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing");
}
