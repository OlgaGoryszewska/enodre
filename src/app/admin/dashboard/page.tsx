import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { TodayWidget } from "@/components/admin/TodayWidget";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { MoodTracker } from "@/components/admin/MoodTracker";
import { CalorieTracker } from "@/components/admin/CalorieTracker";
import { WorkoutTracker } from "@/components/admin/WorkoutTracker";
import { MediaListCard } from "@/components/admin/MediaListCard";
import { InspiringPeopleCard } from "@/components/admin/InspiringPeopleCard";
import { LatestPodcast } from "@/components/admin/LatestPodcast";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AffirmationProvider } from "@/components/admin/AffirmationToast";
import { createClient } from "@/lib/supabase/server";
import { getLatestOnPurposeEpisode } from "@/lib/youtube";
import { addBook, deleteBook, setBookRead, updateBookNote } from "@/app/admin/dashboard/books-actions";
import { addWatchItem, deleteWatchItem, setWatchItemWatched, updateWatchItemNote } from "@/app/admin/dashboard/watch-actions";
import {
  addInspiringPerson,
  deleteInspiringPerson,
  updateInspiringPersonReason,
} from "@/app/admin/dashboard/people-actions";
import { BookOpen, Film } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar";
import type { Task } from "@/lib/task";
import type { MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";
import { BOOKS_SELECT, WATCH_SELECT, type MediaItem } from "@/lib/media-item";
import type { InspiringPerson } from "@/lib/inspiring-person";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Admin dashboard.",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [
    { data: eventsData, error: eventsError },
    { data: tasksData, error: tasksError },
    { data: moodData, error: moodError },
    { data: journalData, error: journalError },
    { data: calorieData, error: calorieError },
    { data: workoutData, error: workoutError },
    { data: booksData, error: booksError },
    { data: watchData, error: watchError },
    { data: peopleData, error: peopleError },
    episode,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .gte("start_time", startOfToday.toISOString())
      .lt("start_time", startOfTomorrow.toISOString())
      .order("start_time", { ascending: true }),
    supabase.from("tasks").select("*").order("position", { ascending: true }),
    supabase.from("mood_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("calorie_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("workout_entries").select("*").order("entry_date", { ascending: false }).limit(7),
    supabase.from("books_to_read").select(BOOKS_SELECT).order("created_at", { ascending: false }),
    supabase.from("things_to_watch").select(WATCH_SELECT).order("created_at", { ascending: false }),
    supabase.from("inspiring_people").select("*").order("created_at", { ascending: false }),
    getLatestOnPurposeEpisode(),
  ]);

  if (eventsError) {
    console.error("Failed to load today's events:", eventsError);
  }
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
  if (booksError) {
    console.error("Failed to load books:", booksError);
  }
  if (watchError) {
    console.error("Failed to load watch list:", watchError);
  }
  if (peopleError) {
    console.error("Failed to load inspiring people:", peopleError);
  }

  const events = (eventsData ?? []) as CalendarEvent[];
  const tasks = (tasksData ?? []) as Task[];
  const moodEntries = (moodData ?? []) as MoodEntry[];
  const journalEntries = (journalData ?? []) as JournalEntry[];
  const calorieEntries = (calorieData ?? []) as CalorieEntry[];
  const workoutEntries = (workoutData ?? []) as WorkoutEntry[];
  const books = (booksData ?? []) as unknown as MediaItem[];
  const watchList = (watchData ?? []) as unknown as MediaItem[];
  const inspiringPeople = (peopleData ?? []) as InspiringPerson[];

  const today = todayKey();
  const todayMood = moodEntries.find((entry) => entry.entry_date === today) ?? null;
  const todayJournal = journalEntries.find((entry) => entry.entry_date === today) ?? null;
  const todayCalories = calorieEntries.find((entry) => entry.entry_date === today) ?? null;
  const todayWorkout = workoutEntries.find((entry) => entry.entry_date === today) ?? null;

  return (
    <AffirmationProvider>
      <section className="shell py-20 sm:py-28">
        <AdminNav />

        <div className="mt-10">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title mt-4 text-4xl">Dashboard</h1>
        </div>

        <div className="mt-10">
          <TodayWidget
            initialEvents={events}
            tasks={tasks}
            mood={todayMood}
            journal={todayJournal}
            calories={todayCalories}
            workout={todayWorkout}
          />
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

        <div className="mt-10">
          <MediaListCard
            icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
            title="Books to read"
            subtitle="A running reading list"
            categoryLabel="Author"
            doneLabel="Read"
            notDoneLabel="To read"
            items={books}
            onAdd={addBook}
            onDelete={deleteBook}
            onToggleDone={setBookRead}
            onUpdateNote={updateBookNote}
          />
        </div>

        <div className="mt-10">
          <MediaListCard
            icon={<Film className="h-4 w-4" aria-hidden="true" />}
            title="Things to watch"
            subtitle="Movies, shows, and everything in between"
            categoryLabel="Type"
            doneLabel="Watched"
            notDoneLabel="To watch"
            items={watchList}
            onAdd={addWatchItem}
            onDelete={deleteWatchItem}
            onToggleDone={setWatchItemWatched}
            onUpdateNote={updateWatchItemNote}
          />
        </div>

        <div className="mt-10">
          <InspiringPeopleCard
            people={inspiringPeople}
            onAdd={addInspiringPerson}
            onDelete={deleteInspiringPerson}
            onUpdateReason={updateInspiringPersonReason}
          />
        </div>

        <div className="mt-16">
          <SignOutButton />
        </div>
      </section>
    </AffirmationProvider>
  );
}
