import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runJobAgent } from "@/lib/job-agent";
import { getGmailMailer } from "@/lib/mailer";

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
    // A failed run writes no report, so say so in the inbox instead of staying silent.
    const mailer = getGmailMailer();
    await mailer?.transporter
      .sendMail({
        from: `"Job agent" <${mailer.address}>`,
        to: process.env.JOB_AGENT_REPORT_TO || mailer.address,
        subject: "Job agent: this morning's run failed",
        text: `The run stopped before it finished, so there is no report today.\n\n${
          error instanceof Error ? error.message : "Unknown error"
        }\n\nApplications sent before it stopped are on Find jobs, under Sent applications.`,
      })
      .catch((mailError) => console.error("Failure email failed too:", mailError));
    return NextResponse.json({ ok: false, error: "Job agent failed — see the logs." }, { status: 500 });
  }
}
