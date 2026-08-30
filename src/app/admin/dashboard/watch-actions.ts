"use server";

import { revalidatePath } from "next/cache";
import { mediaItemFormSchema } from "@/lib/media-item-schema";
import { createClient } from "@/lib/supabase/server";

const TABLE = "things_to_watch";

export async function addWatchItem(formData: FormData) {
  const values = mediaItemFormSchema.parse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    url: formData.get("url") || undefined,
  });

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({
    title: values.title,
    watch_type: values.category || null,
    url: values.url || null,
  });

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function deleteWatchItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function setWatchItemWatched(id: string, isWatched: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ is_watched: isWatched }).eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function updateWatchItemNote(id: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ note: note || null })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}
