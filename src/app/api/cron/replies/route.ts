import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkReplies } from "@/lib/reply-check";

// Vercel Cron, every morning before the job agent (vercel.json): reads both
// inboxes for replies. Its own route, so it doesn't eat into the job agent's
// time. Same Bearer CRON_SECRET check as the job agent.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await checkReplies(createAdminClient());
    if (result.problems.length) console.error("Reply check problems:", result.problems);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Reply check failed:", error);
    return NextResponse.json({ ok: false, error: "Reply check failed — see the logs." }, { status: 500 });
  }
}
