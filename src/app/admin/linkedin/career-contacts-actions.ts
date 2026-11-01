"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CAREER_KIND_VALUES, CAREER_STATUS_VALUES } from "@/lib/career-contact";
import { osloToday } from "@/lib/gtm-logic";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const contactSchema = z.object({
  kind: z.enum(CAREER_KIND_VALUES),
  name: z.string().trim().min(1, "Name is required.").max(200),
  organisation: text(200),
  linkedin: text(500),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((value) => value || null)
    .pipe(z.email("That doesn't look like a valid email address.").nullable())
    .nullable()
    .optional(),
  website: text(500),
  notes: text(2000),
});

export async function addCareerContact(input: z.input<typeof contactSchema>) {
  const values = contactSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("career_contacts").insert(values);
  if (error) throw new Error(error.code === "23505" ? "That contact is already in the list." : error.message);
  revalidatePath("/admin/linkedin");
}

const updateSchema = z.object({
  status: z.enum(CAREER_STATUS_VALUES).optional(),
  notes: text(2000),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((value) => value || null)
    .pipe(z.email().nullable())
    .nullable()
    .optional(),
  linkedin: text(500),
});

export async function updateCareerContact(id: string, input: z.input<typeof updateSchema>) {
  const values = updateSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("career_contacts")
    .update({
      ...values,
      // First outreach date, so follow-ups can be timed.
      ...(values.status === "contacted" ? { last_contacted_on: osloToday() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", z.uuid().parse(id));
  if (error) throw error;
  revalidatePath("/admin/linkedin");
}

export async function deleteCareerContact(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("career_contacts").delete().eq("id", z.uuid().parse(id));
  if (error) throw error;
  revalidatePath("/admin/linkedin");
}
