"use server";

import { revalidatePath } from "next/cache";
import { jobLeadFormSchema } from "@/lib/job-lead-schema";
import { createClient } from "@/lib/supabase/server";

const TABLE = "upwork_jobs";

export async function addUpworkJob(formData: FormData) {
  const values = jobLeadFormSchema.parse({
    title: formData.get("title"),
    company: formData.get("company") || undefined,
    url: formData.get("url"),
  });

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({
    title: values.title,
    company: values.company || null,
    url: values.url,
  });

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function deleteUpworkJob(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function setUpworkJobProposalSent(id: string, proposalSent: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ proposal_sent: proposalSent })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function updateUpworkJobNote(id: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ note: note || null })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}
