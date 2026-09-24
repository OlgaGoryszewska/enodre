"use server";

import { revalidatePath } from "next/cache";
import { mediaItemFormSchema } from "@/lib/media-item-schema";
import { createClient } from "@/lib/supabase/server";

const TABLE = "learning_items";

export async function addLearningItem(formData: FormData) {
  const values = mediaItemFormSchema.parse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    url: formData.get("url") || undefined,
  });

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({
    title: values.title,
    skill: values.category || null,
    url: values.url || null,
  });

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function deleteLearningItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function setLearningItemCompleted(id: string, isCompleted: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ is_completed: isCompleted }).eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function updateLearningItemNote(id: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ note: note || null })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}
