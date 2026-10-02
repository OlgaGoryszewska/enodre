import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { MoodTracker } from "@/components/admin/MoodTracker";
import { CalorieTracker } from "@/components/admin/CalorieTracker";
import { WorkoutTracker } from "@/components/admin/WorkoutTracker";
import { WeeklySummaryCard } from "@/components/admin/WeeklySummaryCard";
import { AffirmationProvider } from "@/components/admin/AffirmationToast";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/task";
import type { MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";
import type { UnicornEntry } from "@/lib/unicorn";

export const metadata: Metadata = {
  title: "Health",
  description: "Mood, nutrition, and workout tracking.",
};

export default async function AdminHealthPage() {
  const supabase = await createClient();

  const [
    { data: tasksData, error: tasksError },
    { data: moodData, error: moodError },
    { data: journalData, error: journalError },
    { data: calorieData, error: calorieError },
    { data: workoutData, error: workoutError },
    { data: unicornData, error: unicornError },
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("position", { ascending: true }),
    supabase.from("mood_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("calorie_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("workout_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("unicorn_entries").select("*").order("entry_date", { ascending: false }).limit(7),
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
  if (unicornError) {
    console.error("Failed to load unicorn entries:", unicornError);
  }

  const tasks = (tasksData ?? []) as Task[];
  const moodEntries = (moodData ?? []) as MoodEntry[];
  const journalEntries = (journalData ?? []) as JournalEntry[];
  const calorieEntries = (calorieData ?? []) as CalorieEntry[];
  const workoutEntries = (workoutData ?? []) as WorkoutEntry[];
  const unicornEntries = (unicornData ?? []) as UnicornEntry[];

  return (
    <AffirmationProvider>
      <section className="shell py-20 sm:py-28">
        <AdminNav />

        <div className="mt-10">
          <h1 className="page-title text-2xl">Health</h1>
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

        <div className="mt-10">
          <WeeklySummaryCard
            moodEntries={moodEntries}
            calorieEntries={calorieEntries}
            workoutEntries={workoutEntries}
            unicornEntries={unicornEntries}
            tasks={tasks}
          />
        </div>
      </section>
    </AffirmationProvider>
  );
}
