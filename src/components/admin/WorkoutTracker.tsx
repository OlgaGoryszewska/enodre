"use client";

import { useState } from "react";
import { Dumbbell, Loader2 } from "lucide-react";
import type { WorkoutEntry } from "@/lib/workout";
import { saveWorkoutEntry } from "@/app/admin/dashboard/workout-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { Accordion } from "@/components/admin/Accordion";
import { useAffirmation } from "@/components/admin/AffirmationToast";
import { cn } from "@/lib/utils";

interface WorkoutTrackerProps {
  entries: WorkoutEntry[];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function WorkoutTracker({ entries }: WorkoutTrackerProps) {
  const showAffirmation = useAffirmation();
  const todayEntry = entries.find((entry) => entry.entry_date === todayKey()) ?? null;

  const [workout, setWorkout] = useState(todayEntry?.workout ?? "");
  const [duration, setDuration] = useState(todayEntry?.duration_minutes?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const dirty =
    workout !== (todayEntry?.workout ?? "") ||
    duration !== (todayEntry?.duration_minutes?.toString() ?? "");

  async function handleSave() {
    if (!workout.trim()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("workout", workout);
      formData.set("durationMinutes", duration);
      await saveWorkoutEntry(formData);
      showAffirmation();
    } catch (error) {
      console.error("Failed to save workout entry:", error);
    } finally {
      setSaving(false);
    }
  }

  const history = entries.filter((entry) => entry.entry_date !== todayKey()).slice(0, 6);

  return (
    <Accordion
      icon={<Dumbbell className="h-4 w-4" aria-hidden="true" />}
      title="Workout of the day"
      subtitle="What did you train today?"
    >
      <div className="grid gap-3">
        <div>
          <label htmlFor="workout" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Workout
          </label>
          <Textarea
            id="workout"
            rows={3}
            value={workout}
            onChange={(event) => setWorkout(event.target.value)}
            placeholder="5k run, push day, rest day..."
            className="mt-2"
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="w-40">
            <label
              htmlFor="workout-duration"
              className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
            >
              Minutes (optional)
            </label>
            <Input
              id="workout-duration"
              type="number"
              min={0}
              inputMode="numeric"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder="45"
              className="mt-2"
            />
          </div>
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !workout.trim()}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save"}
            </button>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-6 border-t border-black/10 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Recent</p>
          <ul className="mt-3 grid gap-2">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-baseline gap-2 text-sm">
                <span className="shrink-0 text-xs text-ink-muted">
                  {new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </span>
                <span className="truncate">{entry.workout}</span>
                {entry.duration_minutes != null && (
                  <span className="shrink-0 text-xs text-ink-muted">{entry.duration_minutes}m</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Accordion>
  );
}
