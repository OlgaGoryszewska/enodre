"use server";

import { revalidatePath } from "next/cache";
import { workoutFormSchema } from "@/lib/workout-schema";
import { createClient } from "@/lib/supabase/server";

export async function saveWorkoutEntry(formData: FormData) {
  const durationRaw = formData.get("durationMinutes");
  const values = workoutFormSchema.parse({
    workout: formData.get("workout"),
    durationMinutes:
      durationRaw && String(durationRaw).trim() !== "" ? Number(durationRaw) : undefined,
  });

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("workout_entries").upsert(
    {
      entry_date: today,
      workout: values.workout,
      duration_minutes: values.durationMinutes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entry_date" }
  );

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}

export async function updateWorkoutEntry(id: string, workout: string) {
  const values = workoutFormSchema.parse({ workout });
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_entries")
    .update({ workout: values.workout, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}

export async function deleteWorkoutEntry(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("workout_entries").delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/calendar");
}
