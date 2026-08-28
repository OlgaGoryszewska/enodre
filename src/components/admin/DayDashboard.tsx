"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { taskStatusLabels, type Task } from "@/lib/task";
import type { CalendarEvent } from "@/lib/calendar";
import { moodEmoji, moodLabel, type MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";
import { cn } from "@/lib/utils";

interface DayDashboardProps {
  events: CalendarEvent[];
  tasks: Task[];
  mood: MoodEntry | null;
  journal: JournalEntry | null;
  calories: CalorieEntry | null;
  workout: WorkoutEntry | null;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onEditTask: (task: Task) => void;
}

// Matches the calendar grid's own slotMinTime — the hour list covers the
// same range so nothing shown on the grid is missing here.
const START_HOUR = 5;
const END_HOUR = 23;

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatHourLabel(hour: number) {
  const reference = new Date();
  reference.setHours(hour, 0, 0, 0);
  return reference.toLocaleTimeString(undefined, { hour: "numeric" });
}

function groupEventsByHour(timedEvents: CalendarEvent[]) {
  const hours = new Map<number, CalendarEvent[]>();
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    hours.set(hour, []);
  }
  for (const event of timedEvents) {
    const hour = new Date(event.start_time).getHours();
    const bucket = hours.get(hour);
    if (bucket) bucket.push(event);
  }
  return hours;
}

type WellnessItem = { icon: string; label: string; content: string; meta?: string };

function buildWellnessItems(
  mood: MoodEntry | null,
  journal: JournalEntry | null,
  calories: CalorieEntry | null,
  workout: WorkoutEntry | null
): WellnessItem[] {
  const items: WellnessItem[] = [];

  if (mood) {
    items.push({ icon: moodEmoji(mood.mood), label: "Mood", content: mood.note || moodLabel(mood.mood) });
  }
  if (journal) {
    items.push({ icon: "📓", label: "Journal", content: journal.entry });
  }
  if (calories) {
    items.push({
      icon: "🍎",
      label: `${calories.calories.toLocaleString()} kcal`,
      content: calories.note || "",
    });
  }
  if (workout) {
    items.push({
      icon: "🏋️",
      label: "Workout",
      content: workout.workout,
      meta: workout.duration_minutes != null ? `${workout.duration_minutes}m` : undefined,
    });
  }

  return items;
}

// The inline "day dashboard" shown in place of FullCalendar's own grid body
// when the calendar is switched to Day view (see Calendar.tsx) — deliberately
// not a modal, so it reads as a real page section rather than a popup.
export function DayDashboard({
  events,
  tasks,
  mood,
  journal,
  calories,
  workout,
  onAddEvent,
  onEditEvent,
  onEditTask,
}: DayDashboardProps) {
  const [expandedHours, setExpandedHours] = useState<Set<number>>(new Set());

  function toggleHour(hour: number) {
    setExpandedHours((current) => {
      const next = new Set(current);
      if (next.has(hour)) next.delete(hour);
      else next.add(hour);
      return next;
    });
  }

  const allDayEvents = events.filter((event) => event.all_day);
  const timedEvents = events.filter((event) => !event.all_day);
  const hourGroups = groupEventsByHour(timedEvents);
  const wellnessItems = buildWellnessItems(mood, journal, calories, workout);
  const hasNothingAllDay =
    allDayEvents.length === 0 && tasks.length === 0 && wellnessItems.length === 0;

  return (
    <div className="mt-4">
      {/* All day — the main section: dated tasks, all-day events, and
          today's wellness entries all live here since none of them belong
          to a specific hour. */}
      <div className="rounded-2xl border border-black/10 bg-background p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">All day</h3>
          <button
            type="button"
            onClick={onAddEvent}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add event
          </button>
        </div>

        {hasNothingAllDay && <p className="mt-3 text-sm text-ink-muted">Nothing all day.</p>}

        {wellnessItems.length > 0 && (
          <div className="mt-3 grid gap-2">
            {wellnessItems.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-2 rounded-xl border border-black/10 bg-card p-3 text-sm"
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.label}</span>
                    {item.meta && <span className="flex-none text-xs text-ink-muted">{item.meta}</span>}
                  </div>
                  {item.content && <p className="mt-0.5 text-xs text-ink-muted">{item.content}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {(allDayEvents.length > 0 || tasks.length > 0) && (
          <div className="mt-3 grid gap-2">
            {allDayEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEditEvent(event)}
                className="rounded-xl border border-black/10 bg-card p-3 text-left text-sm transition hover:border-black/25"
              >
                <span className="font-medium">{event.title}</span>
                {event.description && (
                  <p className="mt-1 text-xs text-ink-muted">{event.description}</p>
                )}
              </button>
            ))}
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onEditTask(task)}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-card p-3 text-left text-sm transition hover:border-black/25"
              >
                <span className="font-medium">{task.title}</span>
                <span className="flex-none text-xs text-ink-muted">
                  {taskStatusLabels[task.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hours — one compact line per hour; a row with more than one event
          or a description expands in place instead of pushing everything
          into a separate detail view. */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Hours</h3>
        <div className="mt-3 divide-y divide-black/10 rounded-2xl border border-black/10">
          {[...hourGroups.entries()].map(([hour, hourEvents]) => {
            const isExpanded = expandedHours.has(hour);
            const canExpand = hourEvents.length > 0;
            const summary =
              hourEvents.length === 0
                ? null
                : hourEvents.length === 1
                  ? hourEvents[0].title
                  : `${hourEvents[0].title} +${hourEvents.length - 1} more`;

            return (
              <div key={hour}>
                <button
                  type="button"
                  onClick={() => canExpand && toggleHour(hour)}
                  disabled={!canExpand}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition",
                    canExpand ? "hover:bg-background" : "cursor-default"
                  )}
                >
                  <span className="w-16 shrink-0 text-xs text-ink-muted">{formatHourLabel(hour)}</span>
                  <span className={cn("min-w-0 flex-1 truncate", !summary && "text-ink-muted")}>
                    {summary ?? "—"}
                  </span>
                  {canExpand && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-ink-muted transition-transform",
                        isExpanded && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </button>

                {isExpanded && (
                  <div className="grid gap-2 px-3 pb-3 pl-[4.75rem]">
                    {hourEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onEditEvent(event)}
                        className="rounded-xl border border-black/10 bg-background p-3 text-left text-sm transition hover:border-black/25"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-medium">{event.title}</span>
                          <span className="flex-none text-xs text-ink-muted">
                            {formatTime(event.start_time)}
                          </span>
                        </span>
                        {event.description && (
                          <p className="mt-1 text-xs text-ink-muted">{event.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
