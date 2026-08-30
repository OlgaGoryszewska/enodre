"use server";

import { revalidatePath } from "next/cache";
import { mediaItemFormSchema } from "@/lib/media-item-schema";
import { createClient } from "@/lib/supabase/server";

const TABLE = "books_to_read";

export async function addBook(formData: FormData) {
  const values = mediaItemFormSchema.parse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    url: formData.get("url") || undefined,
  });

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({
    title: values.title,
    author: values.category || null,
    url: values.url || null,
  });

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function deleteBook(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function setBookRead(id: string, isRead: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ is_read: isRead }).eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function updateBookNote(id: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ note: note || null })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}
