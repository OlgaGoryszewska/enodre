import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPmuAgent } from "@/lib/pmu-agent-run";

// Vercel Cron, every morning (vercel.json): the PMU agent's search for new
// places and job ads. Same Bearer CRON_SECRET check as the job agent.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { stats } = await runPmuAgent(createAdminClient(), "cron");
    return NextResponse.json({
      ok: true,
      places: stats.places.length,
      ads: stats.ads.length,
      problems: stats.problems,
    });
  } catch (error) {
    console.error("PMU agent run failed:", error);
    return NextResponse.json({ ok: false, error: "PMU agent failed — see the logs." }, { status: 500 });
  }
}
