import type { Metadata } from "next";
import { Briefcase, UserSearch } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { JobLeadsCard } from "@/components/admin/JobLeadsCard";
import { RecentJobsWidget } from "@/components/admin/RecentJobsWidget";
import { createClient } from "@/lib/supabase/server";
import {
  addLinkedInJob,
  deleteLinkedInJob,
  setLinkedInJobProposalSent,
  updateLinkedInJobNote,
} from "@/app/admin/dashboard/linkedin-actions";
import {
  addHeadhunter,
  deleteHeadhunter,
  setHeadhunterSent,
  updateHeadhunterNote,
} from "@/app/admin/dashboard/headhunter-actions";
import type { JobLead } from "@/lib/job-lead";
import { JobAgentPanel, type JobAgentRun, type JobPosting } from "@/components/admin/JobAgentPanel";
import {
  runJobAgentNow,
  saveJobProfileAnswer,
  setJobPostingStatus,
  uploadCv,
} from "@/app/admin/linkedin/job-agent-actions";
import { ApplicationDetails } from "@/components/admin/ApplicationDetails";
import { JOB_AGENT } from "@/lib/job-agent";

// "Run now" on the job agent can take a few minutes.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Applying for jobs",
  description: "Job search tracking — LinkedIn, headhunters, and AI-found matches.",
};

export default async function AdminLinkedInPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [{ data: linkedInJobsData, error: linkedInJobsError }, { data: headhuntersData, error: headhuntersError }] =
    await Promise.all([
      supabase.from("linkedin_jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("headhunters").select("*").order("created_at", { ascending: false }),
    ]);

  // Job agent (job_agent.sql) — a missing table means the migration hasn't run.
  const [postingsResult, runResult, openResult, cvList, profileResult] = await Promise.all([
    supabase
      .from("job_postings")
      .select("*")
      .in("status", ["new", "applied", "interview"])
      .order("score", { ascending: false })
      .limit(200),
    supabase
      .from("job_agent_runs")
      .select("created_at, trigger, report")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("open_applications").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.storage.from("private").list("cv"),
    supabase.from("job_profile").select("key, value"),
  ]);
  const jobProfile = Object.fromEntries(
    (profileResult.data ?? []).map((row) => [row.key as string, row.value as string])
  );
  const jobAgentSetupMissing = Boolean(postingsResult.error);
  if (postingsResult.error) console.error("Job agent tables missing or unreadable:", postingsResult.error.message);
  const jobPostings = (postingsResult.data ?? []) as JobPosting[];
  const lastJobAgentRun = ((runResult.data ?? [])[0] ?? null) as JobAgentRun | null;
  const cvUploaded = (cvList.data ?? []).some((file) => `cv/${file.name}` === JOB_AGENT.cvPath);

  if (linkedInJobsError) {
    console.error("Failed to load LinkedIn jobs:", linkedInJobsError);
  }
  if (headhuntersError) {
    console.error("Failed to load headhunters:", headhuntersError);
  }

  const linkedInJobs = (linkedInJobsData ?? []) as JobLead[];
  const headhunters = (headhuntersData ?? []) as JobLead[];
  const recentLinkedInJobs = linkedInJobs.filter((job) => job.created_at >= sevenDaysAgo.toISOString());

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <h1 className="page-title text-2xl">Applying for jobs</h1>
      </div>

      <div className="mt-10">
        <JobAgentPanel
          postings={jobPostings}
          lastRun={lastJobAgentRun}
          cvUploaded={cvUploaded}
          openApplicationsSent={openResult.count ?? 0}
          setupMissing={jobAgentSetupMissing}
          onRunNow={runJobAgentNow}
          onSetStatus={setJobPostingStatus}
          onUploadCv={uploadCv}
        />
      </div>

      {!profileResult.error && (
        <div className="mt-10">
          <ApplicationDetails profile={jobProfile} onSave={saveJobProfileAnswer} />
        </div>
      )}

      <div className="mt-10">
        <RecentJobsWidget linkedinJobs={recentLinkedInJobs} />
      </div>

      <div className="mt-10">
        <JobLeadsCard
          icon={<Briefcase className="h-4 w-4 text-accent" aria-hidden="true" />}
          heading="LinkedIn jobs"
          subtitle="Paste in matches you find worth tracking"
          companyLabel="Company"
          jobs={linkedInJobs}
          onAdd={addLinkedInJob}
          onDelete={deleteLinkedInJob}
          onSetProposalSent={setLinkedInJobProposalSent}
          onUpdateNote={updateLinkedInJobNote}
        />
      </div>

      <div className="mt-10">
        <JobLeadsCard
          icon={<UserSearch className="h-4 w-4 text-accent" aria-hidden="true" />}
          heading="Headhunters"
          subtitle="Recruiters you've sent a CV or message to"
          companyLabel="Agency"
          titleLabel="Name"
          titlePlaceholder="Sarah Cohen"
          jobs={headhunters}
          onAdd={addHeadhunter}
          onDelete={deleteHeadhunter}
          onSetProposalSent={setHeadhunterSent}
          onUpdateNote={updateHeadhunterNote}
        />
      </div>
    </section>
  );
}
