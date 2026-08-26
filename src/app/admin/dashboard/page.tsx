import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { MoodTracker } from "@/components/admin/MoodTracker";
import { LatestPodcast } from "@/components/admin/LatestPodcast";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { getLatestOnPurposeEpisode } from "@/lib/youtube";
import type { Task } from "@/lib/task";
import type { MoodEntry } from "@/lib/mood";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Admin dashboard.",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { data: tasksData, error: tasksError },
    { data: moodData, error: moodError },
    latestEpisode,
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("position", { ascending: true }),
    supabase.from("mood_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    getLatestOnPurposeEpisode(),
  ]);

  if (tasksError) {
    console.error("Failed to load tasks:", tasksError);
  }
  if (moodError) {
    console.error("Failed to load mood entries:", moodError);
  }

  const tasks = (tasksData ?? []) as Task[];
  const moodEntries = (moodData ?? []) as MoodEntry[];

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Dashboard</h1>
      </div>

      <div className="mt-10">
        <LatestPodcast episode={latestEpisode} />
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
