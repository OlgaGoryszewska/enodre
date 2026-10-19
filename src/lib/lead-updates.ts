// Server-side helpers for writing to potential_customers, shared by the
// marketing server actions. Not a "use server" file — import only from them.
import type { createClient } from "@/lib/supabase/server";
import { addBusinessDays, PROPOSAL_FOLLOW_UP_BUSINESS_DAYS } from "@/lib/gtm-logic";
import type { PotentialCustomerStatus } from "@/lib/potential-customer";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Columns added by gtm_command_centre.sql. Until it has run, writes that
// include them fail with "column does not exist" (Postgres 42703) — then the
// write is retried without them, so nothing else is lost.
const FOLLOW_UP_COLUMNS = ["next_follow_up_on", "next_action"] as const;
const UNDEFINED_COLUMN = "42703";
const UNDEFINED_COLUMN_CACHE = "PGRST204";

export function isMissingColumnError(error: { code?: string } | null) {
  return error?.code === UNDEFINED_COLUMN || error?.code === UNDEFINED_COLUMN_CACHE;
}

export async function updateLead(supabase: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const values = { ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("potential_customers").update(values).eq("id", id);
  if (!error) return;
  if (isMissingColumnError(error) && FOLLOW_UP_COLUMNS.some((column) => column in values)) {
    const fallback = Object.fromEntries(
      Object.entries(values).filter(([key]) => !(FOLLOW_UP_COLUMNS as readonly string[]).includes(key))
    );
    const { error: retryError } = await supabase.from("potential_customers").update(fallback).eq("id", id);
    if (retryError) throw retryError;
    return;
  }
  throw error;
}

/** Follow-up changes that go with a status change (the GTM plan's rules). */
export function followUpForStatus(status: PotentialCustomerStatus, today: string): Record<string, unknown> {
  switch (status) {
    case "proposal_sent":
      return {
        next_follow_up_on: addBusinessDays(today, PROPOSAL_FOLLOW_UP_BUSINESS_DAYS),
        next_action: "Follow up on the proposal",
      };
    case "call_booked":
      // The booked call itself becomes the next task (prepare for it).
      return { next_follow_up_on: null, next_action: "Prepare for the discovery call" };
    case "converted":
    case "not_interested":
      // Won or out: no more routine reminders.
      return { next_follow_up_on: null, next_action: null };
    default:
      return {};
  }
}
