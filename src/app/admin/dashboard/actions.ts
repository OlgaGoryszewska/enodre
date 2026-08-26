"use server";

import { revalidatePath } from "next/cache";
import { taskFormSchema } from "@/lib/task-schema";
import { TASK_STATUS_VALUES, type TaskStatus } from "@/lib/task";
import { createClient } from "@/lib/supabase/server";

function parseForm(formData: FormData) {
  return taskFormSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    repeatDaily: formData.get("repeatDaily") === "on",
  });
}

function revalidateTaskPaths() {
  revalidatePath("/admin/dashboard");
  // Tasks with dates show up on the calendar too.
  revalidatePath("/admin/calendar");
}

export async function createTask(status: string, formData: FormData) {
  if (!TASK_STATUS_VALUES.includes(status as TaskStatus)) {
    throw new Error("Invalid status.");
  }

  const values = parseForm(formData);
  const supabase = await createClient();

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  const { error } = await supabase.from("tasks").insert({
    title: values.title,
    description: values.description || null,
    status,
    position: count ?? 0,
    start_date: values.startDate || null,
    end_date: values.endDate || null,
    repeat_daily: values.repeatDaily,
  });

  if (error) throw error;

  revalidateTaskPaths();
}

export async function updateTask(id: string, formData: FormData) {
  const values = parseForm(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      title: values.title,
      description: values.description || null,
      start_date: values.startDate || null,
      end_date: values.endDate || null,
      repeat_daily: values.repeatDaily,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidateTaskPaths();
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw error;

  revalidateTaskPaths();
}
