"use server";

import { revalidatePath } from "next/cache";
import { journalFormSchema } from "@/lib/journal-schema";
import { createClient } from "@/lib/supabase/server";

export async function saveJournalEntry(formData: FormData) {
  const values = journalFormSchema.parse({
    entry: formData.get("entry"),
  });

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("journal_entries").upsert(
    {
      entry_date: today,
      entry: values.entry,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entry_date" }
  );

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}

export async function updateJournalEntry(id: string, entry: string) {
  const values = journalFormSchema.parse({ entry });
  const supabase = await createClient();

  const { error } = await supabase
    .from("journal_entries")
    .update({ entry: values.entry, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}

export async function deleteJournalEntry(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("journal_entries").delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}
