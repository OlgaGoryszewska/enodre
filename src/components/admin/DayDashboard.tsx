"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, Dumbbell, Flame, Loader2, MoreVertical, Plus, Smile } from "lucide-react";
import { taskStatusLabels, type Task } from "@/lib/task";
import type { CalendarEvent } from "@/lib/calendar";
import { moodLabel, type MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";

export type WellnessKind = "mood" | "journal" | "calories" | "workout";

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
  onQuickAddNote: (hour: number, text: string) => Promise<void>;
  onSaveNote: (id: string, text: string) => Promise<void>;
  onRemoveNote: (id: string) => Promise<void>;
  onSaveWellnessEntry: (kind: WellnessKind, id: string, text: string) => Promise<void>;
  onRemoveWellnessEntry: (kind: WellnessKind, id: string) => Promise<void>;
}

// Matches the calendar grid's own slotMinTime — the hour list covers the
// same range so nothing shown on the grid is missing here.
const START_HOUR = 5;
const END_HOUR = 23;

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

type WellnessItem = {
  id: string;
  kind: WellnessKind;
  icon: ReactNode;
  label: string;
  content: string;
  meta?: string;
};

function buildWellnessItems(
  mood: MoodEntry | null,
  journal: JournalEntry | null,
  calories: CalorieEntry | null,
  workout: WorkoutEntry | null
): WellnessItem[] {
  const items: WellnessItem[] = [];

  if (mood) {
    items.push({
      id: mood.id,
      kind: "mood",
      icon: <Smile className="h-4 w-4" aria-hidden="true" />,
      label: "Mood",
      content: mood.note || moodLabel(mood.mood),
    });
  }
  if (journal) {
    items.push({
      id: journal.id,
      kind: "journal",
      icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
      label: "Journal",
      content: journal.entry,
    });
  }
  if (calories) {
    items.push({
      id: calories.id,
      kind: "calories",
      icon: <Flame className="h-4 w-4" aria-hidden="true" />,
      label: `${calories.calories.toLocaleString()} kcal`,
      content: calories.note || "",
    });
  }
  if (workout) {
    items.push({
      id: workout.id,
      kind: "workout",
      icon: <Dumbbell className="h-4 w-4" aria-hidden="true" />,
      label: "Workout",
      content: workout.workout,
      meta: workout.duration_minutes != null ? `${workout.duration_minutes}m` : undefined,
    });
  }

  return items;
}

// A plain text input, not a full form — typing a note and pressing Enter
// (or clicking away) saves it immediately as a timed event at that hour.
function HourNoteInput({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onSubmit(trimmed);
      setValue("");
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        onBlur={submit}
        disabled={saving}
        placeholder=""
        className="w-full rounded-xl border border-dashed border-black/15 bg-background px-3 py-2.5 pr-8 text-sm text-foreground transition focus:border-accent/40 focus:outline-none disabled:opacity-60"
      />
      {saving && (
        <Loader2
          className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-ink-muted"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// The only way to reach edit/remove for an existing entry — never the row
// itself, so plain text stays inert and clicking around it does nothing.
function NoteKebabMenu({
  onEdit,
  onRemove,
  removing,
}: {
  onEdit: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(clickEvent: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(clickEvent.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={removing}
        aria-label="Options"
        className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-black/5 disabled:opacity-50"
      >
        {removing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-10 w-28 overflow-hidden rounded-xl border border-black/10 bg-card shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="block w-full px-3 py-2 text-left text-xs font-medium transition hover:bg-background"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-danger transition hover:bg-background"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// An existing hour note — plain text with a kebab menu that's the only way
// to edit or remove it, so the row itself never reacts to a click.
function HourNoteRow({
  event,
  onSave,
  onRemove,
}: {
  event: CalendarEvent;
  onSave: (text: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(event.title);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function submitEdit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await onRemove();
    } catch (error) {
      console.error("Failed to remove note:", error);
      setRemoving(false);
    }
  }

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(inputEvent) => setValue(inputEvent.target.value)}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === "Enter") {
            keyEvent.preventDefault();
            submitEdit();
          }
          if (keyEvent.key === "Escape") {
            setValue(event.title);
            setEditing(false);
          }
        }}
        onBlur={submitEdit}
        disabled={saving}
        className="w-full rounded-xl border border-accent/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none disabled:opacity-60"
      />
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-background px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
      <NoteKebabMenu onEdit={() => setEditing(true)} onRemove={handleRemove} removing={removing} />
    </div>
  );
}

// A wellness entry (mood, journal, calories, workout) for the day — same
// kebab-only edit/remove pattern as hour notes, editing just the freeform
// text (note/entry/workout description), not the structured fields.
function WellnessItemRow({
  item,
  onSave,
  onRemove,
}: {
  item: WellnessItem;
  onSave: (text: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function submitEdit() {
    setSaving(true);
    try {
      await onSave(value.trim());
      setEditing(false);
    } catch (error) {
      console.error("Failed to save entry:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await onRemove();
    } catch (error) {
      console.error("Failed to remove entry:", error);
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-black/10 bg-card p-3 text-sm">
      <span className="mt-0.5 shrink-0 text-accent" aria-hidden="true">
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{item.label}</span>
          {item.meta && <span className="flex-none text-xs text-ink-muted">{item.meta}</span>}
        </div>
        {editing ? (
          <textarea
            autoFocus
            rows={2}
            value={value}
            onChange={(inputEvent) => setValue(inputEvent.target.value)}
            onBlur={submitEdit}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === "Escape") {
                setValue(item.content);
                setEditing(false);
              }
            }}
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-accent/40 bg-background px-2 py-1 text-xs text-foreground focus:outline-none disabled:opacity-60"
          />
        ) : (
          item.content && <p className="mt-0.5 text-xs text-ink-muted">{item.content}</p>
        )}
      </div>
      <NoteKebabMenu onEdit={() => setEditing(true)} onRemove={handleRemove} removing={removing} />
    </div>
  );
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
  onQuickAddNote,
  onSaveNote,
  onRemoveNote,
  onSaveWellnessEntry,
  onRemoveWellnessEntry,
}: DayDashboardProps) {
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
            onClick={() => onAddEvent()}
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
              <WellnessItemRow
                key={item.id}
                item={item}
                onSave={(text) => onSaveWellnessEntry(item.kind, item.id, text)}
                onRemove={() => onRemoveWellnessEntry(item.kind, item.id)}
              />
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

      {/* Hours — every hour is always visible with its note input right
          there; no click-to-expand. Existing notes only offer edit/remove
          through their own kebab menu, so the row itself stays inert. */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Hours</h3>
        <div className="mt-3 divide-y divide-black/10 rounded-2xl border border-black/10">
          {[...hourGroups.entries()].map(([hour, hourEvents]) => (
            <div key={hour} className="flex items-start gap-3 px-3 py-2.5">
              <span className="w-16 shrink-0 pt-2 text-xs text-ink-muted">{formatHourLabel(hour)}</span>
              <div className="grid min-w-0 flex-1 gap-2">
                {hourEvents.map((event) => (
                  <HourNoteRow
                    key={event.id}
                    event={event}
                    onSave={(text) => onSaveNote(event.id, text)}
                    onRemove={() => onRemoveNote(event.id)}
                  />
                ))}
                <HourNoteInput onSubmit={(text) => onQuickAddNote(hour, text)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
