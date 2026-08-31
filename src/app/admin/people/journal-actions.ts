"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "customer_journal_entries";

// Called imperatively from the journal's add/edit/delete handlers, not bound
// <form action>s, so every action takes customerId explicitly. createdAt is
// picked by the user (defaults to now in the UI) rather than always using
// the DB's own insert-time default, so a past entry can be backdated.
export async function addCustomerJournalEntry(customerId: string, content: string, createdAt: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ customer_id: customerId, content, created_at: createdAt })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
  return data;
}

export async function updateCustomerJournalEntry(
  customerId: string,
  entryId: string,
  content: string,
  createdAt: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ content, created_at: createdAt, updated_at: new Date().toISOString() })
    .eq("id", entryId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function deleteCustomerJournalEntry(customerId: string, entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", entryId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}
