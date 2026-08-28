import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { MoodTracker } from "@/components/admin/MoodTracker";
import { CalorieTracker } from "@/components/admin/CalorieTracker";
import { WorkoutTracker } from "@/components/admin/WorkoutTracker";
import { LatestPodcast } from "@/components/admin/LatestPodcast";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { getLatestOnPurposeEpisode } from "@/lib/youtube";
import type { Task } from "@/lib/task";
import type { MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Admin dashboard.",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { data: tasksData, error: tasksError },
    { data: moodData, error: moodError },
    { data: journalData, error: journalError },
    { data: calorieData, error: calorieError },
    { data: workoutData, error: workoutError },
    episode,
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("position", { ascending: true }),
    supabase.from("mood_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("calorie_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("workout_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    getLatestOnPurposeEpisode(),
  ]);

  if (tasksError) {
    console.error("Failed to load tasks:", tasksError);
  }
  if (moodError) {
    console.error("Failed to load mood entries:", moodError);
  }
  if (journalError) {
    console.error("Failed to load journal entries:", journalError);
  }
  if (calorieError) {
    console.error("Failed to load calorie entries:", calorieError);
  }
  if (workoutError) {
    console.error("Failed to load workout entries:", workoutError);
  }

  const tasks = (tasksData ?? []) as Task[];
  const moodEntries = (moodData ?? []) as MoodEntry[];
  const journalEntries = (journalData ?? []) as JournalEntry[];
  const calorieEntries = (calorieData ?? []) as CalorieEntry[];
  const workoutEntries = (workoutData ?? []) as WorkoutEntry[];

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Dashboard</h1>
      </div>

      <div className="mt-10">
        <LatestPodcast episode={episode} />
      </div>

      <div className="mt-10">
        <KanbanBoard initialTasks={tasks} />
      </div>

      <div className="mt-10">
        <MoodTracker entries={moodEntries} journalEntries={journalEntries} />
      </div>

      <div className="mt-10">
        <CalorieTracker entries={calorieEntries} />
      </div>

      <div className="mt-10">
        <WorkoutTracker entries={workoutEntries} />
      </div>

      <div className="mt-16">
        <SignOutButton />
      </div>
    </section>
  );
}
