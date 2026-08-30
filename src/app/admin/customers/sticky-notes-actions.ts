"use server";

import { revalidatePath } from "next/cache";
import {
  STICKY_NOTE_COLORS,
  STICKY_NOTE_FONTS,
  STICKY_NOTE_TEXT_SIZES,
  type StickyNoteColor,
  type StickyNoteFont,
  type StickyNoteTextSize,
} from "@/lib/customer-sticky-note";
import { createClient } from "@/lib/supabase/server";

const TABLE = "customer_sticky_notes";

// These are called imperatively from drag/edit handlers, not bound <form
// action>s, so every action takes customerId explicitly rather than via
// .bind(null, id).
export async function addStickyNote(customerId: string, posX: number, posY: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ customer_id: customerId, pos_x: Math.round(posX), pos_y: Math.round(posY) })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
  return data;
}

export async function updateStickyNotePosition(
  customerId: string,
  noteId: string,
  posX: number,
  posY: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ pos_x: Math.round(posX), pos_y: Math.round(posY), updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateStickyNoteContent(customerId: string, noteId: string, content: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateStickyNoteColor(customerId: string, noteId: string, color: StickyNoteColor) {
  if (!STICKY_NOTE_COLORS.includes(color)) {
    throw new Error("Invalid color.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ color, updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateStickyNoteSize(
  customerId: string,
  noteId: string,
  width: number,
  height: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ width: Math.round(width), height: Math.round(height), updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateStickyNoteFont(customerId: string, noteId: string, font: StickyNoteFont) {
  if (!STICKY_NOTE_FONTS.includes(font)) {
    throw new Error("Invalid font.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ font, updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateStickyNoteTextSize(
  customerId: string,
  noteId: string,
  textSize: StickyNoteTextSize
) {
  if (!STICKY_NOTE_TEXT_SIZES.includes(textSize)) {
    throw new Error("Invalid text size.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ text_size: textSize, updated_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function deleteStickyNote(customerId: string, noteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", noteId);

  if (error) throw error;

  revalidatePath(`/admin/customers/${customerId}`);
}
