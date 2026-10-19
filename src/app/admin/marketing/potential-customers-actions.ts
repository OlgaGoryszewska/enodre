"use server";

import { revalidatePath } from "next/cache";
import {
  potentialCustomerDetailsSchema,
  potentialCustomerFormSchema,
  type PotentialCustomerDetails,
} from "@/lib/potential-customer-schema";
import {
  POTENTIAL_CUSTOMER_STATUS_VALUES,
  POTENTIAL_CUSTOMER_ATTITUDE_VALUES,
  type PotentialCustomerStatus,
  type PotentialCustomerAttitude,
} from "@/lib/potential-customer";
import { createClient } from "@/lib/supabase/server";
import { addBusinessDays, osloToday } from "@/lib/gtm-logic";
import { followUpForStatus, updateLead } from "@/lib/lead-updates";

const TABLE = "potential_customers";

export async function addPotentialCustomer(formData: FormData) {
  const values = potentialCustomerFormSchema.parse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    source: formData.get("source") || undefined,
  });

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({
    name: values.name,
    company: values.company || null,
    email: values.email || null,
    phone: values.phone || null,
    source: values.source || null,
    status: "new",
  });

  if (error) throw error;

  revalidatePath("/admin/marketing", "layout");
}

export async function setPotentialCustomerStatus(id: string, status: string) {
  if (!POTENTIAL_CUSTOMER_STATUS_VALUES.includes(status as PotentialCustomerStatus)) {
    throw new Error("Invalid status.");
  }

  const supabase = await createClient();
  const nextStatus = status as PotentialCustomerStatus;
  await updateLead(supabase, id, { status: nextStatus, ...followUpForStatus(nextStatus, osloToday()) });

  // Booking a call creates the call record (its preparation shows up in
  // Today's priorities) unless one is already open for this lead.
  if (nextStatus === "call_booked") {
    const { data: open, error: openError } = await supabase
      .from("discovery_calls")
      .select("id")
      .eq("lead_id", id)
      .eq("status", "booked")
      .limit(1);
    if (openError) {
      // discovery_calls doesn't exist until gtm_command_centre.sql has run.
      console.error("Couldn't check for an open discovery call:", openError);
    } else if (!open?.length) {
      const { error: insertError } = await supabase.from("discovery_calls").insert({ lead_id: id, status: "booked" });
      if (insertError) console.error("Couldn't create the discovery call:", insertError);
    }
  }

  revalidatePath("/admin/marketing", "layout");
}

/** Pushes the next follow-up out by a number of business days (Today's priorities → Snooze). */
export async function snoozeFollowUp(id: string, businessDays: number) {
  if (!Number.isInteger(businessDays) || businessDays < 1 || businessDays > 20) {
    throw new Error("Invalid snooze.");
  }
  const supabase = await createClient();
  await updateLead(supabase, id, { next_follow_up_on: addBusinessDays(osloToday(), businessDays) });
  revalidatePath("/admin/marketing", "layout");
}

export async function setPotentialCustomerMessageSent(id: string, messageSent: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ message_sent: messageSent, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing", "layout");
}

export async function setPotentialCustomerCallMade(id: string, callMade: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ call_made: callMade, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing", "layout");
}

export async function setPotentialCustomerResponded(id: string, responded: boolean) {
  const supabase = await createClient();
  // A reply takes the lead out of the unanswered follow-up queue and asks for
  // the reply to be recorded.
  await updateLead(
    supabase,
    id,
    responded
      ? { responded, next_follow_up_on: null, next_action: "Record their reply and choose the next step" }
      : { responded }
  );

  revalidatePath("/admin/marketing", "layout");
}

export async function setPotentialCustomerAttitude(id: string, attitude: string | null) {
  if (attitude !== null && !POTENTIAL_CUSTOMER_ATTITUDE_VALUES.includes(attitude as PotentialCustomerAttitude)) {
    throw new Error("Invalid attitude.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ attitude, updated_at: new Date().toISOString() }).eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing", "layout");
}

export async function updatePotentialCustomerNote(id: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ notes, updated_at: new Date().toISOString() }).eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing", "layout");
}

export async function deletePotentialCustomer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/marketing", "layout");
}

export async function updatePotentialCustomerDetails(id: string, details: PotentialCustomerDetails) {
  const values = potentialCustomerDetailsSchema.parse(details);

  const supabase = await createClient();
  await updateLead(supabase, id, values);

  revalidatePath("/admin/marketing", "layout");
}

/** Today's priorities → "No follow-up needed": clears the pending follow-up. */
export async function clearFollowUp(id: string) {
  const supabase = await createClient();
  await updateLead(supabase, id, { next_follow_up_on: null });
  revalidatePath("/admin/marketing", "layout");
}
