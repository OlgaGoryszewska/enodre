import type { Metadata } from "next";
import { Briefcase, UserSearch } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { AiJobMatches } from "@/components/admin/AiJobMatches";
import { JobLeadsCard } from "@/components/admin/JobLeadsCard";
import { RecentJobsWidget } from "@/components/admin/RecentJobsWidget";
import { createClient } from "@/lib/supabase/server";
import { getTodaysLinkedInMatches, LINKEDIN_EMAIL_MODEL } from "@/lib/ai-job-matches";
import { getLatestSearchRun, getMonthToDateSpendUsd } from "@/lib/ai-search-runs";
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

export const metadata: Metadata = {
  title: "Applying for jobs",
  description: "Job search tracking — LinkedIn, headhunters, and AI-found matches.",
};

export default async function AdminLinkedInPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [
    { data: linkedInJobsData, error: linkedInJobsError },
    { data: headhuntersData, error: headhuntersError },
    linkedInAiMatches,
    lastAiSearchRun,
    aiSearchMonthToDateSpendUsd,
  ] = await Promise.all([
    supabase.from("linkedin_jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("headhunters").select("*").order("created_at", { ascending: false }),
    getTodaysLinkedInMatches(),
    getLatestSearchRun(LINKEDIN_EMAIL_MODEL),
    getMonthToDateSpendUsd(LINKEDIN_EMAIL_MODEL),
  ]);

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
        <AiJobMatches
          heading="AI-found LinkedIn jobs"
          subtitle="Pulled from your LinkedIn job-alert emails, verified as recently posted"
          matches={linkedInAiMatches}
          lastRun={lastAiSearchRun}
          monthToDateSpendUsd={aiSearchMonthToDateSpendUsd}
        />
      </div>

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
