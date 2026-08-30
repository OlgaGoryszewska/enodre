"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type FullCalendar from "@fullcalendar/react";
import { EventDialog } from "@/components/admin/EventDialog";
import { TaskDialog } from "@/components/admin/TaskDialog";
import { DayDashboard, type WellnessKind } from "@/components/admin/DayDashboard";
import { createEvent, updateEvent, deleteEvent } from "@/app/admin/calendar/actions";
import { updateMoodNote, deleteMoodEntry } from "@/app/admin/dashboard/mood-actions";
import { updateJournalEntry, deleteJournalEntry } from "@/app/admin/dashboard/journal-actions";
import { updateCalorieNote, deleteCalorieEntry } from "@/app/admin/dashboard/calorie-actions";
import { updateWorkoutEntry, deleteWorkoutEntry } from "@/app/admin/dashboard/workout-actions";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/lib/calendar";
import type { Task } from "@/lib/task";
import type { WellnessMarker } from "@/lib/wellness-markers";
import type { MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";
import "@/components/admin/calendar.css";

const FullCalendarClient = dynamic(() => import("@/components/admin/FullCalendarClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center text-sm text-ink-muted">
      Loading calendar...
    </div>
  ),
});

interface CalendarProps {
  initialEvents: CalendarEvent[];
  tasks: Task[];
  wellnessMarkers: WellnessMarker[];
  moodEntries: MoodEntry[];
  journalEntries: JournalEntry[];
  calorieEntries: CalorieEntry[];
  workoutEntries: WorkoutEntry[];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function Calendar({
  initialEvents,
  tasks,
  wellnessMarkers,
  moodEntries,
  journalEntries,
  calorieEntries,
  workoutEntries,
}: CalendarProps) {
  const [events, setEvents] = useState(initialEvents);

  // Server Actions (create/edit/delete) revalidate this route, which sends
  // fresh initialEvents down as a prop — resync local state when that
  // happens (React's "adjusting state when a prop changes" pattern, done
  // during render rather than in an effect). Local state otherwise diverges
  // only for the optimistic drag update below, between the drop and the
  // write resolving.
  const [prevInitialEvents, setPrevInitialEvents] = useState(initialEvents);
  if (initialEvents !== prevInitialEvents) {
    setPrevInitialEvents(initialEvents);
    setEvents(initialEvents);
  }

  const calendarRef = useRef<FullCalendar>(null);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventInitialDate, setEventInitialDate] = useState<Date | null>(null);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  async function handleEventDrop(id: string, start: Date, end: Date | null, allDay: boolean) {
    const previous = events;
    const endTime = end ?? new Date(start.getTime() + 60 * 60 * 1000);

    setEvents((current) =>
      current.map((event) =>
        event.id === id
          ? {
              ...event,
              start_time: start.toISOString(),
              end_time: endTime.toISOString(),
              all_day: allDay,
            }
          : event
      )
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({
        start_time: start.toISOString(),
        end_time: endTime.toISOString(),
        all_day: allDay,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Failed to reschedule event:", error);
      setEvents(previous);
    }
  }

  function handleDateClick(date: Date) {
    calendarRef.current?.getApi().changeView("timeGridDay", date);
  }

  function handleDatesSet(newViewType: string, start: Date) {
    setDayViewDate(newViewType === "timeGridDay" ? start : null);
  }

  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event);
    setEventInitialDate(null);
    setEventDialogOpen(true);
  }

  function handleTaskClick(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setSelectedTask(task);
    setTaskDialogOpen(true);
  }

  function handleAddEventFromDay() {
    setSelectedEvent(null);
    setEventInitialDate(dayViewDate);
    setEventDialogOpen(true);
  }

  async function handleQuickAddNote(hour: number, text: string) {
    if (!dayViewDate) return;
    const start = new Date(dayViewDate);
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

  function handleEditEventFromDay(event: CalendarEvent) {
    setSelectedEvent(event);
    setEventInitialDate(null);
    setEventDialogOpen(true);
  }

  function handleEditTaskFromDay(task: Task) {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  }

  const dayEvents = dayViewDate
    ? events.filter((event) => isSameDay(new Date(event.start_time), dayViewDate))
    : [];
  const dayTasks = dayViewDate
    ? tasks.filter((task) => {
        if (!task.start_date || !task.end_date) return false;
        const dateKey = toDateKey(dayViewDate);
        return dateKey >= task.start_date && dateKey <= task.end_date;
      })
    : [];
  const dayViewDateKey = dayViewDate ? toDateKey(dayViewDate) : null;
  const dayMood = dayViewDateKey
    ? (moodEntries.find((entry) => entry.entry_date === dayViewDateKey) ?? null)
    : null;
  const dayJournal = dayViewDateKey
    ? (journalEntries.find((entry) => entry.entry_date === dayViewDateKey) ?? null)
    : null;
  const dayCalories = dayViewDateKey
    ? (calorieEntries.find((entry) => entry.entry_date === dayViewDateKey) ?? null)
    : null;
  const dayWorkout = dayViewDateKey
    ? (workoutEntries.find((entry) => entry.entry_date === dayViewDateKey) ?? null)
    : null;

  return (
    <>
      <div
        className="admin-calendar rounded-2xl border border-black/10 bg-card p-4 sm:p-6"
        data-day-view={dayViewDate ? "true" : undefined}
      >
        <FullCalendarClient
          ref={calendarRef}
          events={events}
          taskEvents={tasks}
          wellnessMarkers={wellnessMarkers}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onTaskClick={handleTaskClick}
          onEventDrop={handleEventDrop}
          onDatesSet={handleDatesSet}
        />

        {dayViewDate && (
          <DayDashboard
            key={dayViewDate.toISOString()}
            events={dayEvents}
            tasks={dayTasks}
            mood={dayMood}
            journal={dayJournal}
            calories={dayCalories}
            workout={dayWorkout}
            onAddEvent={handleAddEventFromDay}
            onEditEvent={handleEditEventFromDay}
            onEditTask={handleEditTaskFromDay}
            onQuickAddNote={handleQuickAddNote}
            onSaveNote={handleSaveNote}
            onRemoveNote={handleRemoveNote}
            onSaveWellnessEntry={handleSaveWellnessEntry}
            onRemoveWellnessEntry={handleRemoveWellnessEntry}
          />
        )}
      </div>

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        initialDate={eventInitialDate}
      />

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        createStatus={null}
      />
    </>
  );
}
