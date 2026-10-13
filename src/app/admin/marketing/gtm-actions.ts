"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GTM_TASKS, GTM_TASK_PREFIX } from "@/lib/gtm-plan";

/** Adds the GTM plan's to-dos to the marketing kanban, skipping ones already there. */
export async function addGtmTasksToBoard() {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("marketing_tasks")
    .select("title, status")
    .like("title", `${GTM_TASK_PREFIX}%`);
  if (existingError) throw existingError;

  const existingTitles = new Set((existing ?? []).map((task) => task.title as string));
  const missing = GTM_TASKS.filter((task) => !existingTitles.has(`${GTM_TASK_PREFIX}${task.title}`));
  if (missing.length === 0) return { added: 0 };

  const { count, error: countError } = await supabase
    .from("marketing_tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "todo");
  if (countError) throw countError;

  const { error } = await supabase.from("marketing_tasks").insert(
    missing.map((task, index) => ({
      title: `${GTM_TASK_PREFIX}${task.title}`,
      description: task.description,
      status: "todo",
      position: (count ?? 0) + index,
    }))
  );
  if (error) throw error;

  revalidatePath("/admin/marketing");
  return { added: missing.length };
}
