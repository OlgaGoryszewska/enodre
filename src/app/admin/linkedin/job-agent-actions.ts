"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { JOB_AGENT, runJobAgent } from "@/lib/job-agent";
import { PROFILE_FIELDS } from "@/lib/job-profile";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return supabase;
}

/** "Run now" — the same run the cron does each morning, with your session. */
export async function runJobAgentNow() {
  const supabase = await requireAdmin();
  const { stats } = await runJobAgent(supabase, "manual");
  revalidatePath("/admin/linkedin");
  return { saved: stats.saved, emailed: stats.emailed.length, openApplications: stats.openApplications.length };
}

const statusSchema = z.enum(["new", "applied", "dismissed", "interview", "rejected"]);

export async function setJobPostingStatus(id: string, status: z.input<typeof statusSchema>) {
  const supabase = await requireAdmin();
  const value = statusSchema.parse(status);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("job_postings")
    .update({
      status: value,
      updated_at: now,
      ...(value === "applied" ? { applied_at: now, applied_via: "form" } : {}),
      // Back to "new" = not applied after all.
      ...(value === "new" ? { applied_at: null, applied_via: null } : {}),
    })
    .eq("id", z.uuid().parse(id));
  if (error) throw error;
  revalidatePath("/admin/linkedin");
}

/** Stores the CV privately; the agent attaches it to every application. */
export async function uploadCv(formData: FormData) {
  const supabase = await requireAdmin();
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a PDF first.");
  if (file.type !== "application/pdf") throw new Error("The CV must be a PDF.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Keep the CV under 5 MB.");
  const { error } = await supabase.storage
    .from("private")
    .upload(JOB_AGENT.cvPath, file, { upsert: true, contentType: "application/pdf" });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  revalidatePath("/admin/linkedin");
}

/** Saves one of your standard answers for application forms. */
export async function saveJobProfileAnswer(key: string, value: string) {
  const supabase = await requireAdmin();
  const field = PROFILE_FIELDS.find((item) => item.key === key);
  if (!field) throw new Error("Unknown field.");
  const { error } = await supabase
    .from("job_profile")
    .upsert({ key, value: value.trim().slice(0, 2000), updated_at: new Date().toISOString() });
  if (error) throw error;
  revalidatePath("/admin/linkedin");
}
