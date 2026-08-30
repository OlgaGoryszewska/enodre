"use server";

import { revalidatePath } from "next/cache";
import { calorieFormSchema } from "@/lib/calorie-schema";
import { createClient } from "@/lib/supabase/server";

export async function saveCalorieEntry(formData: FormData) {
  const caloriesBurnedRaw = formData.get("caloriesBurned");
  const values = calorieFormSchema.parse({
    calories: Number(formData.get("calories")),
    caloriesBurned:
      caloriesBurnedRaw && String(caloriesBurnedRaw).trim() !== "" ? Number(caloriesBurnedRaw) : undefined,
    note: formData.get("note") || undefined,
  });

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("calorie_entries").upsert(
    {
      entry_date: today,
      calories: values.calories,
      calories_burned: values.caloriesBurned ?? null,
      note: values.note || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entry_date" }
  );

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}

export async function updateCalorieNote(id: string, note: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("calorie_entries")
    .update({ note: note.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}

export async function deleteCalorieEntry(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("calorie_entries").delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}
