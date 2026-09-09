"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_UNICORNS_PER_DAY } from "@/lib/unicorn";

const TABLE = "unicorn_entries";

async function getTodaysCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entryDate: string
): Promise<number> {
  const { data, error } = await supabase.from(TABLE).select("count").eq("entry_date", entryDate).maybeSingle();
  if (error) throw error;
  return data?.count ?? 0;
}

export async function incrementUnicorns(entryDate: string) {
  const supabase = await createClient();
  const current = await getTodaysCount(supabase, entryDate);
  if (current >= MAX_UNICORNS_PER_DAY) {
    throw new Error("Today's 6 spots are full.");
  }

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { entry_date: entryDate, count: current + 1, updated_at: new Date().toISOString() },
      { onConflict: "entry_date" }
    );

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function decrementUnicorns(entryDate: string) {
  const supabase = await createClient();
  const current = await getTodaysCount(supabase, entryDate);
  if (current <= 0) return;

  const { error } = await supabase
    .from(TABLE)
    .update({ count: current - 1, updated_at: new Date().toISOString() })
    .eq("entry_date", entryDate);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}
