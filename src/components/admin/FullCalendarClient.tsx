"use client";

import { forwardRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, {
  type DateClickArg,
  type EventResizeDoneArg,
} from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, DatesSetArg } from "@fullcalendar/core";
import type { CalendarEvent } from "@/lib/calendar";
import type { Task } from "@/lib/task";
import type { WellnessMarker } from "@/lib/wellness-markers";

const TASK_ID_PREFIX = "task-";
const WELLNESS_ID_PREFIX = "wellness-";

// FullCalendar's `end` is exclusive for all-day events, but our end_date is
// meant to be inclusive (the task runs through that day) — bump it by one
// day so the bar actually covers the last day instead of stopping short.
function dayAfter(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function eachDateInclusive(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// A repeating task shows as a separate entry on every day in its range;
// otherwise it's one bar spanning start_date through end_date. The real
// task id lives in extendedProps (not parsed from the DOM id string) since
// task ids are UUIDs and would collide with our own "-" separators.
function buildTaskEventInputs(task: Task) {
  const classNames = ["fc-task-event", `fc-task-${task.status}`];
  if (!task.start_date || !task.end_date) return [];

  if (task.repeat_daily) {
    return eachDateInclusive(task.start_date, task.end_date).map((date) => ({
      id: `${TASK_ID_PREFIX}${task.id}-${date}`,
      title: `↻ ${task.title}`,
      start: date,
      end: dayAfter(date),
      allDay: true,
      editable: false,
      classNames,
      extendedProps: { taskId: task.id },
    }));
  }

  return [
    {
      id: `${TASK_ID_PREFIX}${task.id}`,
      title: task.title,
      start: task.start_date,
      end: dayAfter(task.end_date),
      allDay: true,
      editable: false,
      classNames,
      extendedProps: { taskId: task.id },
    },
  ];
}

// Read-only badge showing which daily wellness trackers (journal, calorie
// count, workout) have an entry on that date — not clickable or draggable,
// just a visibility marker.
function buildWellnessEventInputs(marker: WellnessMarker) {
  return {
    id: `${WELLNESS_ID_PREFIX}${marker.date}`,
    title: marker.label,
    start: marker.date,
    end: dayAfter(marker.date),
    allDay: true,
    editable: false,
    classNames: ["fc-wellness-marker"],
  };
}

interface FullCalendarClientProps {
  events: CalendarEvent[];
  taskEvents: Task[];
  wellnessMarkers: WellnessMarker[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (taskId: string) => void;
  onEventDrop: (id: string, start: Date, end: Date | null, allDay: boolean) => void;
  onDatesSet: (viewType: string, start: Date) => void;
}

// forwardRef so Calendar.tsx can hold a ref to the underlying FullCalendar
// instance and drive it imperatively (changeView) — needed so clicking a
// date jumps straight into Day view rather than opening a separate dialog.
// Next.js's dynamic() forwards refs through to a forwardRef component, so
// this works even though FullCalendarClient itself is loaded via dynamic().
const FullCalendarClient = forwardRef<FullCalendar, FullCalendarClientProps>(
  function FullCalendarClient(
    { events, taskEvents, wellnessMarkers, onDateClick, onEventClick, onTaskClick, onEventDrop, onDatesSet },
    ref
  ) {
    return (
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        slotMinTime="05:00:00"
        selectable
        editable
        events={[
          ...events.map((event) => ({
            id: event.id,
            title: event.title,
            start: event.start_time,
            end: event.end_time,
            allDay: event.all_day,
            editable: true,
          })),
          ...taskEvents.flatMap(buildTaskEventInputs),
          ...wellnessMarkers.map(buildWellnessEventInputs),
        ]}
        dateClick={(info: DateClickArg) => onDateClick(info.date)}
        eventClick={(info: EventClickArg) => {
          const taskId = info.event.extendedProps.taskId as string | undefined;
          if (taskId) {
            onTaskClick(taskId);
            return;
          }
          const match = events.find((event) => event.id === info.event.id);
          if (match) onEventClick(match);
        }}
        eventDrop={(info: EventDropArg) => {
          if (info.event.extendedProps.taskId || !info.event.start) return;
          onEventDrop(info.event.id, info.event.start, info.event.end, info.event.allDay);
        }}
        eventResize={(info: EventResizeDoneArg) => {
          if (info.event.extendedProps.taskId || !info.event.start) return;
          onEventDrop(info.event.id, info.event.start, info.event.end, info.event.allDay);
        }}
        datesSet={(info: DatesSetArg) => onDatesSet(info.view.type, info.view.currentStart)}
      />
    );
  }
);

export default FullCalendarClient;
