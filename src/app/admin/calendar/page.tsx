import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { Calendar } from "@/components/admin/Calendar";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { buildWellnessMarkers } from "@/lib/wellness-markers";
import type { CalendarEvent } from "@/lib/calendar";
import type { Task } from "@/lib/task";
import type { MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Admin calendar.",
};

export default async function AdminCalendarPage() {
  const supabase = await createClient();

  const [
    { data: eventsData, error: eventsError },
    { data: tasksData, error: tasksError },
    { data: moodData, error: moodError },
    { data: journalData, error: journalError },
    { data: calorieData, error: calorieError },
    { data: workoutData, error: workoutError },
  ] = await Promise.all([
    supabase.from("events").select("*").order("start_time", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .not("start_date", "is", null)
      .not("end_date", "is", null),
    supabase.from("mood_entries").select("*"),
    supabase.from("journal_entries").select("*"),
    supabase.from("calorie_entries").select("*"),
    supabase.from("workout_entries").select("*"),
  ]);

  if (eventsError) {
    console.error("Failed to load events:", eventsError);
  }
  if (tasksError) {
    console.error("Failed to load dated tasks:", tasksError);
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

  const events = (eventsData ?? []) as CalendarEvent[];
  const tasks = (tasksData ?? []) as Task[];
  const moodEntries = (moodData ?? []) as MoodEntry[];
  const journalEntries = (journalData ?? []) as JournalEntry[];
  const calorieEntries = (calorieData ?? []) as CalorieEntry[];
  const workoutEntries = (workoutData ?? []) as WorkoutEntry[];
  const wellnessMarkers = buildWellnessMarkers(journalEntries, calorieEntries, workoutEntries);

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Calendar</h1>
      </div>

      <div className="mt-10">
        <Calendar
          initialEvents={events}
          tasks={tasks}
          wellnessMarkers={wellnessMarkers}
          moodEntries={moodEntries}
          journalEntries={journalEntries}
          calorieEntries={calorieEntries}
          workoutEntries={workoutEntries}
        />
      </div>

      <div className="mt-16">
        <SignOutButton />
      </div>
    </section>
  );
}
