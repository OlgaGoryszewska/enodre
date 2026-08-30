"use server";

import { revalidatePath } from "next/cache";
import { moodFormSchema } from "@/lib/mood-schema";
import { createClient } from "@/lib/supabase/server";

export async function saveMoodEntry(formData: FormData) {
  const values = moodFormSchema.parse({
    mood: Number(formData.get("mood")),
    note: formData.get("note") || undefined,
  });

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("mood_entries").upsert(
    {
      entry_date: today,
      mood: values.mood,
      note: values.note || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entry_date" }
  );

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}

export async function updateMoodNote(id: string, note: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("mood_entries")
    .update({ note: note.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}

export async function deleteMoodEntry(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("mood_entries").delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}
