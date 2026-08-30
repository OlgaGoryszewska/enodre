"use client";

import { useState } from "react";
import Link from "next/link";
import { EventDialog } from "@/components/admin/EventDialog";
import { TaskDialog } from "@/components/admin/TaskDialog";
import { DayDashboard, type WellnessKind } from "@/components/admin/DayDashboard";
import { createEvent, updateEvent, deleteEvent } from "@/app/admin/calendar/actions";
import { updateMoodNote, deleteMoodEntry } from "@/app/admin/dashboard/mood-actions";
import { updateJournalEntry, deleteJournalEntry } from "@/app/admin/dashboard/journal-actions";
import { updateCalorieNote, deleteCalorieEntry } from "@/app/admin/dashboard/calorie-actions";
import { updateWorkoutEntry, deleteWorkoutEntry } from "@/app/admin/dashboard/workout-actions";
import { isSameDay, toDateKey, type CalendarEvent } from "@/lib/calendar";
import type { Task } from "@/lib/task";
import type { MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";
import "@/components/admin/calendar.css";

interface TodayWidgetProps {
  initialEvents: CalendarEvent[];
  tasks: Task[];
  mood: MoodEntry | null;
  journal: JournalEntry | null;
  calories: CalorieEntry | null;
  workout: WorkoutEntry | null;
}

// The main dashboard's "management center" widget — the same inline day
// dashboard the calendar page uses for its Day view, permanently pinned to
// today rather than switchable, so today's schedule is visible without
// leaving the dashboard.
export function TodayWidget({ initialEvents, tasks, mood, journal, calories, workout }: TodayWidgetProps) {
  const [events, setEvents] = useState(initialEvents);

  // Server Actions revalidate this route, which sends fresh initialEvents
  // down as a prop — resync local state when that happens (same pattern as
  // Calendar.tsx), since events isn't otherwise touched optimistically here.
  const [prevInitialEvents, setPrevInitialEvents] = useState(initialEvents);
  if (initialEvents !== prevInitialEvents) {
    setPrevInitialEvents(initialEvents);
    setEvents(initialEvents);
  }

  const today = new Date();

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventInitialDate, setEventInitialDate] = useState<Date | null>(null);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  function handleAddEvent() {
    setSelectedEvent(null);
    setEventInitialDate(today);
    setEventDialogOpen(true);
  }

  function handleEditEvent(event: CalendarEvent) {
    setSelectedEvent(event);
    setEventInitialDate(null);
    setEventDialogOpen(true);
  }

  function handleEditTask(task: Task) {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  }

  async function handleQuickAddNote(hour: number, text: string) {
    const start = new Date(today);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formData = new FormData();
    formData.set("title", text);
    formData.set("startTime", start.toISOString());
    formData.set("endTime", end.toISOString());

    await createEvent(formData);
  }

  async function handleSaveNote(id: string, text: string) {
    const existing = events.find((event) => event.id === id);
    if (!existing) return;

    const formData = new FormData();
    formData.set("title", text);
    formData.set("startTime", existing.start_time);
    formData.set("endTime", existing.end_time);
    if (existing.all_day) formData.set("allDay", "on");

    await updateEvent(id, formData);
  }

  async function handleRemoveNote(id: string) {
    await deleteEvent(id);
  }

  async function handleSaveWellnessEntry(kind: WellnessKind, id: string, text: string) {
    if (kind === "mood") await updateMoodNote(id, text);
    if (kind === "journal") await updateJournalEntry(id, text);
    if (kind === "calories") await updateCalorieNote(id, text);
    if (kind === "workout") await updateWorkoutEntry(id, text);
  }

  async function handleRemoveWellnessEntry(kind: WellnessKind, id: string) {
    if (kind === "mood") await deleteMoodEntry(id);
    if (kind === "journal") await deleteJournalEntry(id);
    if (kind === "calories") await deleteCalorieEntry(id);
    if (kind === "workout") await deleteWorkoutEntry(id);
  }

  const todayKey = toDateKey(today);
  const todayEvents = events.filter((event) => isSameDay(new Date(event.start_time), today));
  const todayTasks = tasks.filter((task) => {
    if (!task.start_date || !task.end_date) return false;
    return todayKey >= task.start_date && todayKey <= task.end_date;
  });

  return (
    <>
      <div className="admin-calendar rounded-2xl border border-black/10 bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Today</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link href="/admin/calendar" className="text-sm font-semibold text-accent hover:opacity-80">
            Full calendar →
          </Link>
        </div>

        <DayDashboard
          events={todayEvents}
          tasks={todayTasks}
          mood={mood}
          journal={journal}
          calories={calories}
          workout={workout}
          onAddEvent={handleAddEvent}
          onEditEvent={handleEditEvent}
          onEditTask={handleEditTask}
          onQuickAddNote={handleQuickAddNote}
          onSaveNote={handleSaveNote}
          onRemoveNote={handleRemoveNote}
          onSaveWellnessEntry={handleSaveWellnessEntry}
          onRemoveWellnessEntry={handleRemoveWellnessEntry}
        />
      </div>

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        initialDate={eventInitialDate}
      />

      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} task={selectedTask} createStatus={null} />
    </>
  );
}
