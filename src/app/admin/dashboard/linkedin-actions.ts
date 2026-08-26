"use server";

import { revalidatePath } from "next/cache";
import { jobLeadFormSchema } from "@/lib/job-lead-schema";
import { createClient } from "@/lib/supabase/server";

const TABLE = "linkedin_jobs";

export async function addLinkedInJob(formData: FormData) {
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

export async function deleteLinkedInJob(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function setLinkedInJobProposalSent(id: string, proposalSent: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ proposal_sent: proposalSent })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}

export async function updateLinkedInJobNote(id: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ note: note || null })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/dashboard");
}
