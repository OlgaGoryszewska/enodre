"use server";

import { revalidatePath } from "next/cache";
import { eventFormSchema } from "@/lib/event-schema";
import { createClient } from "@/lib/supabase/server";

function parseForm(formData: FormData) {
  return eventFormSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    allDay: formData.get("allDay") === "on",
  });
}

export async function createEvent(formData: FormData) {
  const values = parseForm(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("events").insert({
    title: values.title,
    description: values.description || null,
    start_time: new Date(values.startTime).toISOString(),
    end_time: new Date(values.endTime).toISOString(),
    all_day: values.allDay,
  });

  if (error) throw error;

  revalidatePath("/admin/calendar");
  revalidatePath("/admin/dashboard");
}

export async function updateEvent(id: string, formData: FormData) {
  const values = parseForm(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({
      title: values.title,
      description: values.description || null,
      start_time: new Date(values.startTime).toISOString(),
      end_time: new Date(values.endTime).toISOString(),
      all_day: values.allDay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/calendar");
  revalidatePath("/admin/dashboard");
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/calendar");
  revalidatePath("/admin/dashboard");
}
