import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { AiJobMatches } from "@/components/admin/AiJobMatches";
import { JobLeadsCard } from "@/components/admin/JobLeadsCard";
import { UpworkAutoSync } from "@/components/admin/UpworkAutoSync";
import { createClient } from "@/lib/supabase/server";
import { getTodaysUpworkMatches, UPWORK_SEARCH_MODEL } from "@/lib/ai-job-matches";
import { getLatestSearchRun, getMonthToDateSpendUsd } from "@/lib/ai-search-runs";
import { isUpworkConnected } from "@/lib/upwork-auth";
import {
  addUpworkJob,
  deleteUpworkJob,
  setUpworkJobProposalSent,
  updateUpworkJobNote,
} from "@/app/admin/dashboard/upwork-actions";
import type { JobLead } from "@/lib/job-lead";

export const metadata: Metadata = {
  title: "Upwork jobs",
  description: "Upwork client search.",
};

interface AdminUpworkPageProps {
  searchParams: Promise<{ upwork_error?: string }>;
}

export default async function AdminUpworkPage({ searchParams }: AdminUpworkPageProps) {
  const { upwork_error: upworkError } = await searchParams;
  const supabase = await createClient();

  const [
    { data: upworkJobsData, error: upworkJobsError },
    upworkConnected,
    upworkAiMatches,
    lastAiSearchRun,
    aiSearchMonthToDateSpendUsd,
  ] = await Promise.all([
    supabase.from("upwork_jobs").select("*").order("created_at", { ascending: false }),
    isUpworkConnected(),
    getTodaysUpworkMatches(),
    getLatestSearchRun(UPWORK_SEARCH_MODEL),
    getMonthToDateSpendUsd(UPWORK_SEARCH_MODEL),
  ]);

  if (upworkJobsError) {
    console.error("Failed to load Upwork jobs:", upworkJobsError);
  }

  const upworkJobs = (upworkJobsData ?? []) as JobLead[];

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Client search — Upwork</h1>
      </div>

      <div className="mt-10">
        <AiJobMatches
          heading="AI-found Upwork jobs"
          subtitle="Searched daily against your profile, verified via live page fetch"
          matches={upworkAiMatches}
          lastRun={lastAiSearchRun}
          monthToDateSpendUsd={aiSearchMonthToDateSpendUsd}
        />
      </div>

      <div className="mt-10">
        <JobLeadsCard
          icon={<Handshake className="h-4 w-4 text-accent" aria-hidden="true" />}
          heading="Upwork jobs"
          subtitle="Paste in matches you find worth tracking"
          companyLabel="Client"
          jobs={upworkJobs}
          onAdd={addUpworkJob}
          onDelete={deleteUpworkJob}
          onSetProposalSent={setUpworkJobProposalSent}
          onUpdateNote={updateUpworkJobNote}
        />
      </div>

      <div className="mt-10">
        <UpworkAutoSync
          connected={upworkConnected}
          error={upworkError as "config" | "state_mismatch" | "exchange_failed" | undefined}
        />
      </div>
    </section>
  );
}
