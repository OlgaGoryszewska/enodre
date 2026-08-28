import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { AiJobMatches } from "@/components/admin/AiJobMatches";
import { JobLeadsCard } from "@/components/admin/JobLeadsCard";
import { createClient } from "@/lib/supabase/server";
import { getTodaysLinkedInMatches, LINKEDIN_EMAIL_MODEL } from "@/lib/ai-job-matches";
import { getLatestSearchRun, getMonthToDateSpendUsd } from "@/lib/ai-search-runs";
import {
  addLinkedInJob,
  deleteLinkedInJob,
  setLinkedInJobProposalSent,
  updateLinkedInJobNote,
} from "@/app/admin/dashboard/linkedin-actions";
import type { JobLead } from "@/lib/job-lead";

export const metadata: Metadata = {
  title: "LinkedIn jobs",
  description: "LinkedIn job search.",
};

export default async function AdminLinkedInPage() {
  const supabase = await createClient();

  const [
    { data: linkedInJobsData, error: linkedInJobsError },
    linkedInAiMatches,
    lastAiSearchRun,
    aiSearchMonthToDateSpendUsd,
  ] = await Promise.all([
    supabase.from("linkedin_jobs").select("*").order("created_at", { ascending: false }),
    getTodaysLinkedInMatches(),
    getLatestSearchRun(LINKEDIN_EMAIL_MODEL),
    getMonthToDateSpendUsd(LINKEDIN_EMAIL_MODEL),
  ]);

  if (linkedInJobsError) {
    console.error("Failed to load LinkedIn jobs:", linkedInJobsError);
  }

  const linkedInJobs = (linkedInJobsData ?? []) as JobLead[];

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Job search — LinkedIn</h1>
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
    </section>
  );
}
