import type { Metadata } from "next";
import { Briefcase, Handshake } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { MoodTracker } from "@/components/admin/MoodTracker";
import { LatestPodcast } from "@/components/admin/LatestPodcast";
import { JobLeadsCard } from "@/components/admin/JobLeadsCard";
import { UpworkAutoSync } from "@/components/admin/UpworkAutoSync";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { getOnPurposeEpisodes } from "@/lib/youtube";
import { isUpworkConnected } from "@/lib/upwork-auth";
import {
  addLinkedInJob,
  deleteLinkedInJob,
  setLinkedInJobProposalSent,
  updateLinkedInJobNote,
} from "@/app/admin/dashboard/linkedin-actions";
import {
  addUpworkJob,
  deleteUpworkJob,
  setUpworkJobProposalSent,
  updateUpworkJobNote,
} from "@/app/admin/dashboard/upwork-actions";
import type { Task } from "@/lib/task";
import type { MoodEntry } from "@/lib/mood";
import type { JobLead } from "@/lib/job-lead";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Admin dashboard.",
};

interface AdminDashboardPageProps {
  searchParams: Promise<{ upwork_error?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const { upwork_error: upworkError } = await searchParams;
  const supabase = await createClient();

  const [
    { data: tasksData, error: tasksError },
    { data: moodData, error: moodError },
    { data: linkedInJobsData, error: linkedInJobsError },
    { data: upworkJobsData, error: upworkJobsError },
    episodes,
    upworkConnected,
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("position", { ascending: true }),
    supabase.from("mood_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("linkedin_jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("upwork_jobs").select("*").order("created_at", { ascending: false }),
    getOnPurposeEpisodes(),
    isUpworkConnected(),
  ]);

  if (tasksError) {
    console.error("Failed to load tasks:", tasksError);
  }
  if (moodError) {
    console.error("Failed to load mood entries:", moodError);
  }
  if (linkedInJobsError) {
    console.error("Failed to load LinkedIn jobs:", linkedInJobsError);
  }
  if (upworkJobsError) {
    console.error("Failed to load Upwork jobs:", upworkJobsError);
  }

  const tasks = (tasksData ?? []) as Task[];
  const moodEntries = (moodData ?? []) as MoodEntry[];
  const linkedInJobs = (linkedInJobsData ?? []) as JobLead[];
  const upworkJobs = (upworkJobsData ?? []) as JobLead[];

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Dashboard</h1>
      </div>

      <div className="mt-10">
        <LatestPodcast episodes={episodes} />
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

      <div className="mt-10">
        <KanbanBoard initialTasks={tasks} />
      </div>

      <div className="mt-10">
        <MoodTracker entries={moodEntries} />
      </div>

      <div className="mt-16">
        <SignOutButton />
      </div>
    </section>
  );
}
