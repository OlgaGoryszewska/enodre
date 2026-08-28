"use server";

import { revalidatePath } from "next/cache";
import { calorieFormSchema } from "@/lib/calorie-schema";
import { createClient } from "@/lib/supabase/server";

export async function saveCalorieEntry(formData: FormData) {
  const values = calorieFormSchema.parse({
    calories: Number(formData.get("calories")),
    note: formData.get("note") || undefined,
  });

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("calorie_entries").upsert(
    {
      entry_date: today,
      calories: values.calories,
      note: values.note || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entry_date" }
  );

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}
