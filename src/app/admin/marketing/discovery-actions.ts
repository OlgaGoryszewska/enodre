"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { osloToday } from "@/lib/gtm-logic";
import { updateLead } from "@/lib/lead-updates";
import { completionProblems, discoveryCallSchema, type DiscoveryCallInput } from "@/lib/discovery-call";

const TABLE = "discovery_calls";

function refresh() {
  revalidatePath("/admin/marketing", "layout");
}

/** Books a discovery call: creates the call and moves the lead to "call booked". */
export async function bookDiscoveryCall(leadId: string, scheduledOn: string | null) {
  const id = z.uuid().parse(leadId);
  const date = z.iso.date().nullable().parse(scheduledOn);
  const supabase = await createClient();

  const { error } = await supabase.from(TABLE).insert({ lead_id: id, status: "booked", scheduled_on: date });
  if (error) throw error;

  const { data: lead } = await supabase.from("potential_customers").select("status").eq("id", id).single();
  // Only move forward — a lead already further along keeps its stage.
  if (lead && ["new", "contacted", "interested"].includes(lead.status as string)) {
    await updateLead(supabase, id, {
      status: "call_booked",
      next_follow_up_on: null,
      next_action: "Prepare for the discovery call",
    });
  }
  refresh();
}

/** Saves the write-up of a call without changing its status. */
export async function saveDiscoveryCall(callId: string, input: DiscoveryCallInput) {
  const id = z.uuid().parse(callId);
  const values = discoveryCallSchema.parse(input);
  const supabase = await createClient();

  const { data: call, error } = await supabase
    .from(TABLE)
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("lead_id, status")
    .single();
  if (error) throw error;

  // A completed call is the source for the lead's discovery summary.
  if (call.status === "completed") await syncLeadFromCall(supabase, call.lead_id as string, values);
  refresh();
}

/**
 * Marks a call completed. Refused unless it has the customer's description,
 * the hours and a problem category — the week-4 gate only counts complete
 * interviews.
 */
export async function completeDiscoveryCall(callId: string, input: DiscoveryCallInput) {
  const id = z.uuid().parse(callId);
  const values = discoveryCallSchema.parse(input);
  const missing = completionProblems(values);
  if (missing.length > 0) throw new Error(`To complete the call, add ${missing.join(", ")}.`);

  const supabase = await createClient();
  const { data: call, error } = await supabase
    .from(TABLE)
    .update({ ...values, status: "completed", completed_on: osloToday(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("lead_id")
    .single();
  if (error) throw error;

  await syncLeadFromCall(supabase, call.lead_id as string, values, true);
  refresh();
}

export async function cancelDiscoveryCall(callId: string) {
  const id = z.uuid().parse(callId);
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  refresh();
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// The lead's accounting system / hours / pain are a summary of its latest
// completed call — written only from here, so the two can't disagree.
async function syncLeadFromCall(
  supabase: SupabaseClient,
  leadId: string,
  values: z.output<typeof discoveryCallSchema>,
  justCompleted = false
) {
  const { data: lead } = await supabase.from("potential_customers").select("status").eq("id", leadId).single();
  await updateLead(supabase, leadId, {
    accounting_system: values.accounting_system,
    admin_hours_per_week: values.hours_per_week,
    main_pain: values.problem_description,
    next_action: values.next_action,
    next_follow_up_on: values.follow_up_on,
    ...(justCompleted && lead && ["new", "contacted", "interested", "call_booked"].includes(lead.status as string)
      ? { status: "call_done" }
      : {}),
  });
}
