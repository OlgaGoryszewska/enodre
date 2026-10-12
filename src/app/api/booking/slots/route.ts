import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCandidateSlots, removeBusySlots } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY env vars — can't load slots.");
    return NextResponse.json({ ok: false, error: "Booking is unavailable." }, { status: 500 });
  }

  const candidates = generateCandidateSlots();
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, slots: [] });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.rpc("get_busy_times", {
    range_start: candidates[0].start,
    range_end: candidates[candidates.length - 1].end,
  });

  if (error) {
    console.error("Failed to load busy times from Supabase:", error);
    return NextResponse.json({ ok: false, error: "Booking is unavailable." }, { status: 500 });
  }

  const slots = removeBusySlots(candidates, (data ?? []) as { start_time: string; end_time: string }[]);

  return NextResponse.json(
    { ok: true, slots },
    { headers: { "Cache-Control": "no-store" } }
  );
}
