"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_UNICORNS_PER_DAY } from "@/lib/unicorn";

const TABLE = "unicorn_entries";

export async function addUnicorn(entryDate: string, company: string) {
  const trimmed = company.trim();
  if (!trimmed) throw new Error("Company name is required.");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from(TABLE)
    .select("companies")
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const companies: string[] = existing?.companies ?? [];
  if (companies.length >= MAX_UNICORNS_PER_DAY) {
    throw new Error("Today's 6 unicorn spots are full.");
  }

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { entry_date: entryDate, companies: [...companies, trimmed], updated_at: new Date().toISOString() },
      { onConflict: "entry_date" }
    );

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function removeUnicorn(entryDate: string, index: number) {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from(TABLE)
    .select("companies")
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) return;

  const companies: string[] = (existing.companies ?? []).filter((_: string, i: number) => i !== index);

  const { error } = await supabase
    .from(TABLE)
    .update({ companies, updated_at: new Date().toISOString() })
    .eq("entry_date", entryDate);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}
