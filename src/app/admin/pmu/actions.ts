"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { osloToday } from "@/lib/gtm-logic";
import { PMU_KIND_VALUES, PMU_STATUS_VALUES, type PmuStatus } from "@/lib/pmu-agent";
import { ACTIVITY_KINDS, OUTREACH, statusAfter } from "@/lib/pmu-tracking";
import { runPmuAgent } from "@/lib/pmu-agent-run";

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const updateSchema = z.object({
  status: z.enum(PMU_STATUS_VALUES).optional(),
  notes: optional(2000),
  whatsapp: optional(40),
  instagram: optional(200),
  email: optional(254),
});

export async function updatePmuTarget(id: string, input: z.input<typeof updateSchema>): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const values = updateSchema.parse(input);
  const { error } = await supabase
    .from("pmu_targets")
    .update({
      ...values,
      ...(values.status === "contacted" ? { last_contacted_on: osloToday() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", z.uuid().parse(id));
  if (error) return { ok: false, error: "Couldn't save." };
  revalidatePath("/admin/pmu");
  return { ok: true };
}

const addSchema = z.object({
  kind: z.enum(PMU_KIND_VALUES),
  name: z.string().trim().min(1, "Add a name.").max(200),
  city: z.string().trim().min(1, "Add a city.").max(100),
  country: z.string().trim().min(1, "Add a country.").max(100),
  website: optional(500),
  instagram: optional(200),
  whatsapp: optional(40),
  email: optional(254),
  pay_score: z.number().int().min(1).max(5),
  notes: optional(2000),
});

export async function addPmuTarget(input: z.input<typeof addSchema>): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const { error } = await supabase.from("pmu_targets").insert(parsed.data);
  if (error) {
    return { ok: false, error: error.code === "23505" ? "That one is already in the list." : "Couldn't add it." };
  }
  revalidatePath("/admin/pmu");
  return { ok: true };
}

// Keep in sync with the fields on the page.
const PROFILE_KEYS = ["portfolio_instagram", "portfolio_facebook", "available_from"] as const;

export async function savePmuProfile(key: string, value: string): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const field = z.enum(PROFILE_KEYS).parse(key);
  const { error } = await supabase
    .from("pmu_profile")
    .upsert({ key: field, value: value.trim().slice(0, 500), updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "Couldn't save. Has supabase/pmu_agent.sql been run?" };
  revalidatePath("/admin/pmu");
  return { ok: true };
}

export type PmuRunResult = { ok: true; places: number; ads: number; report: string } | { ok: false; error: string };

/** "Search now" (saves what it finds) or "Preview" (saves nothing). */
export async function runPmuAgentNow(preview: boolean): Promise<PmuRunResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  try {
    const { stats, report } = await runPmuAgent(supabase, "manual", { dryRun: preview });
    if (!preview) revalidatePath("/admin/pmu");
    return { ok: true, places: stats.places.length, ads: stats.ads.length, report };
  } catch (error) {
    console.error("PMU agent run failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "The search failed." };
  }
}

export async function setPmuPostingStatus(id: string, status: "new" | "applied" | "dismissed"): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const { error } = await supabase
    .from("pmu_postings")
    .update({ status: z.enum(["new", "applied", "dismissed"]).parse(status) })
    .eq("id", z.uuid().parse(id));
  if (error) return { ok: false, error: "Couldn't save." };
  revalidatePath("/admin/pmu");
  return { ok: true };
}

const activitySchema = z.object({
  kind: z.enum(ACTIVITY_KINDS),
  note: optional(1000),
  /** When it happened, if not now (yyyy-mm-dd). */
  on: z.iso.date().optional(),
});

/**
 * Logs one step with a place (a message sent, a reply, a call …) and moves
 * its stage forward. Your own next step is cleared: the suggested one follows.
 */
export async function logPmuActivity(id: string, input: z.input<typeof activitySchema>): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const targetId = z.uuid().parse(id);
  const values = activitySchema.parse(input);
  const [{ data: target, error: targetError }, { data: earlier }] = await Promise.all([
    supabase.from("pmu_targets").select("status").eq("id", targetId).single(),
    supabase.from("pmu_activity").select("kind").eq("target_id", targetId),
  ]);
  if (targetError || !target) return { ok: false, error: "Couldn't find that place." };
  const at = values.on ? `${values.on}T12:00:00Z` : new Date().toISOString();
  const { error } = await supabase
    .from("pmu_activity")
    .insert({ target_id: targetId, kind: values.kind, note: values.note ?? null, at });
  if (error) return { ok: false, error: "Couldn't save. Run supabase/pmu_agent.sql again in Supabase." };
  const sentBefore = (earlier ?? []).filter((row) => OUTREACH.includes(row.kind)).length;
  const status = statusAfter(target.status as PmuStatus, values.kind, sentBefore);
  await supabase
    .from("pmu_targets")
    .update({
      status,
      ...(OUTREACH.includes(values.kind) ? { last_contacted_on: at.slice(0, 10) } : {}),
      ...(values.kind !== "note" ? { next_action: null, next_action_on: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId);
  revalidatePath("/admin/pmu");
  return { ok: true };
}

export async function deletePmuActivity(id: string): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("pmu_activity").delete().eq("id", z.uuid().parse(id));
  if (error) return { ok: false, error: "Couldn't delete." };
  revalidatePath("/admin/pmu");
  return { ok: true };
}

const nextStepSchema = z.object({
  action: optional(300),
  on: z.iso.date().nullable(),
});

/** Your own next step and date; empty goes back to the suggested one. */
export async function setPmuNextStep(id: string, input: z.input<typeof nextStepSchema>): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const values = nextStepSchema.parse(input);
  const { error } = await supabase
    .from("pmu_targets")
    .update({
      next_action: values.action && values.on ? values.action : null,
      next_action_on: values.action && values.on ? values.on : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", z.uuid().parse(id));
  if (error) return { ok: false, error: "Couldn't save. Run supabase/pmu_agent.sql again in Supabase." };
  revalidatePath("/admin/pmu");
  return { ok: true };
}

const offerSchema = z.object({
  salary: z.string().trim().max(200).optional(),
  commission: z.string().trim().max(200).optional(),
  housing: z.string().trim().max(200).optional(),
  visa: z.string().trim().max(200).optional(),
  flights: z.string().trim().max(200).optional(),
  insurance: z.string().trim().max(200).optional(),
  start: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function savePmuOffer(id: string, input: z.input<typeof offerSchema>): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const offer = offerSchema.parse(input);
  const { error } = await supabase
    .from("pmu_targets")
    .update({ offer, updated_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(id));
  if (error) return { ok: false, error: "Couldn't save. Run supabase/pmu_agent.sql again in Supabase." };
  revalidatePath("/admin/pmu");
  return { ok: true };
}

/** Remove from the list, or bring back. Hidden, never deleted: the history stays. */
export async function setPmuTargetHidden(id: string, hidden: boolean): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const { error } = await supabase
    .from("pmu_targets")
    .update({ hidden: z.boolean().parse(hidden), updated_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(id));
  if (error) return { ok: false, error: "Couldn't remove it. Run supabase/pmu_agent.sql again in Supabase." };
  revalidatePath("/admin/pmu");
  return { ok: true };
}

/** Star a place, or unstar it. Favourites show first, in the green section. */
export async function setPmuFavourite(id: string, favourite: boolean): Promise<Result> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not signed in." };
  const { error } = await supabase
    .from("pmu_targets")
    .update({ favourite: z.boolean().parse(favourite), updated_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(id));
  if (error) return { ok: false, error: "Couldn't save. Run supabase/pmu_agent.sql again in Supabase." };
  revalidatePath("/admin/pmu");
  return { ok: true };
}
