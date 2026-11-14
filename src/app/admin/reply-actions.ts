"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkReplies, type ReplyCheckResult } from "@/lib/reply-check";

/** "Check replies": reads both inboxes now, the same as the morning run. */
export async function checkRepliesNow(): Promise<
  { ok: true; result: ReplyCheckResult } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  try {
    const result = await checkReplies(supabase);
    revalidatePath("/admin/linkedin");
    revalidatePath("/admin/marketing");
    return { ok: true, result };
  } catch (error) {
    console.error("Reply check failed:", error);
    return { ok: false, error: "Couldn't check replies. Has supabase/email_replies.sql been run?" };
  }
}

/** "Count as real" / "Not a real reply": your choice, kept from then on. */
export async function setReplyAutomatic(id: string, isAuto: boolean): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data, error } = await supabase
    .from("email_replies")
    .update({ is_auto: isAuto, auto_set_by_hand: true })
    .eq("id", z.uuid().parse(id))
    .select("contact_id")
    .single();
  if (error) return { ok: false, error: "Couldn't save. Run supabase/email_replies.sql again." };
  // A real reply moves a contacted recruiter or company to Replied.
  if (!isAuto && data?.contact_id) {
    await supabase
      .from("career_contacts")
      .update({ status: "replied", updated_at: new Date().toISOString() })
      .eq("id", data.contact_id)
      .eq("status", "contacted");
  }
  revalidatePath("/admin/linkedin");
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/dashboard");
  return { ok: true, error: null };
}
