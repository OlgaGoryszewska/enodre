"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { customerFormSchema } from "@/lib/customer-schema";
import { CUSTOMER_ROLE_VALUES, CUSTOMER_STATUS_VALUES, type CustomerRole, type CustomerStatus } from "@/lib/customer";
import { createClient } from "@/lib/supabase/server";

const TABLE = "customers";
const BUCKET = "customer-files";

// The optimistic row in CustomersTable links straight to /admin/people/[id]
// on add, before this action's insert resolves — so the client generates the
// id itself and passes it through, keeping the link correct from first paint.
export async function addCustomer(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("Missing customer id.");
  }

  const values = customerFormSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    company: formData.get("company") || undefined,
  });

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({
    id,
    name: values.name,
    email: values.email || null,
    phone: values.phone || null,
    company: values.company || null,
    status: "lead",
  });

  if (error) throw error;

  revalidatePath("/admin/people");
}

export async function updateCustomer(id: string, formData: FormData) {
  const values = customerFormSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    company: formData.get("company") || undefined,
  });

  const status = formData.get("status");
  if (typeof status !== "string" || !CUSTOMER_STATUS_VALUES.includes(status as CustomerStatus)) {
    throw new Error("Invalid status.");
  }

  const notes = formData.get("notes");
  const roles = formData.getAll("roles").filter((role): role is CustomerRole =>
    CUSTOMER_ROLE_VALUES.includes(role as CustomerRole)
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      company: values.company || null,
      status,
      roles,
      notes: (typeof notes === "string" && notes.trim()) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/people");
  revalidatePath(`/admin/people/${id}`);
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();

  // Storage objects have no real FK to customers — only customer_files rows
  // do, and those cascade — so clean up the bucket ourselves first.
  const { data: objects } = await supabase.storage.from(BUCKET).list(id);
  if (objects && objects.length > 0) {
    await supabase.storage.from(BUCKET).remove(objects.map((object) => `${id}/${object.name}`));
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/people");
  redirect("/admin/people");
}

export async function addCustomerFileRecord(
  customerId: string,
  meta: { storagePath: string; originalFilename: string; mimeType: string | null; sizeBytes: number | null }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_files")
    .insert({
      customer_id: customerId,
      storage_path: meta.storagePath,
      original_filename: meta.originalFilename,
      mime_type: meta.mimeType,
      size_bytes: meta.sizeBytes,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/admin/people/${customerId}`);
  return data;
}

export async function updateCustomerFileNote(customerId: string, fileId: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_files")
    .update({ note: note.trim() || null })
    .eq("id", fileId);

  if (error) throw error;

  revalidatePath(`/admin/people/${customerId}`);
}

export async function deleteCustomerFile(customerId: string, fileId: string) {
  const supabase = await createClient();

  const { data: file, error: fetchError } = await supabase
    .from("customer_files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (fetchError) throw fetchError;

  await supabase.storage.from(BUCKET).remove([file.storage_path]);

  const { error } = await supabase.from("customer_files").delete().eq("id", fileId);
  if (error) throw error;

  revalidatePath(`/admin/people/${customerId}`);
}
