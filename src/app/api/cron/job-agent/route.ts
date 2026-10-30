import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runJobAgent } from "@/lib/job-agent";

// Vercel Cron calls this every morning (vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set — anything
// else is refused, so nobody else can trigger emails.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { stats } = await runJobAgent(createAdminClient(), "cron");
    return NextResponse.json({
      ok: true,
      saved: stats.saved,
      emailed: stats.emailed.length,
      openApplications: stats.openApplications.length,
    });
  } catch (error) {
    console.error("Job agent run failed:", error);
    return NextResponse.json({ ok: false, error: "Job agent failed — see the logs." }, { status: 500 });
  }
}
