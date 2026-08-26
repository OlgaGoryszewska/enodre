"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { EventDialog } from "@/components/admin/EventDialog";
import { TaskDialog } from "@/components/admin/TaskDialog";
import { DayDialog } from "@/components/admin/DayDialog";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/lib/calendar";
import type { Task } from "@/lib/task";
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
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function Calendar({ initialEvents, tasks }: CalendarProps) {
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

  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
    setSelectedDate(date);
    setDayDialogOpen(true);
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
    setDayDialogOpen(false);
    setSelectedEvent(null);
    setEventInitialDate(selectedDate);
    setEventDialogOpen(true);
  }

  function handleEditEventFromDay(event: CalendarEvent) {
    setDayDialogOpen(false);
    setSelectedEvent(event);
    setEventInitialDate(null);
    setEventDialogOpen(true);
  }

  function handleEditTaskFromDay(task: Task) {
    setDayDialogOpen(false);
    setSelectedTask(task);
    setTaskDialogOpen(true);
  }

  const dayEvents = selectedDate
    ? events.filter((event) => isSameDay(new Date(event.start_time), selectedDate))
    : [];
  const dayTasks = selectedDate
    ? tasks.filter((task) => {
        if (!task.start_date || !task.end_date) return false;
        const dateKey = toDateKey(selectedDate);
        return dateKey >= task.start_date && dateKey <= task.end_date;
      })
    : [];

  return (
    <>
      <div className="admin-calendar rounded-2xl border border-black/10 bg-card p-4 sm:p-6">
        <FullCalendarClient
          events={events}
          taskEvents={tasks}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onTaskClick={handleTaskClick}
          onEventDrop={handleEventDrop}
        />
      </div>

      <DayDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDate}
        events={dayEvents}
        tasks={dayTasks}
        onAddEvent={handleAddEventFromDay}
        onEditEvent={handleEditEventFromDay}
        onEditTask={handleEditTaskFromDay}
      />

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
