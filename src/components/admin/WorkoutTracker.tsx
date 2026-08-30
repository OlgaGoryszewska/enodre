"use client";

import { useState } from "react";
import { Dumbbell, Loader2 } from "lucide-react";
import type { WorkoutEntry } from "@/lib/workout";
import { saveWorkoutEntry } from "@/app/admin/dashboard/workout-actions";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Accordion } from "@/components/admin/Accordion";
import { useAffirmation } from "@/components/admin/AffirmationToast";
import {
  WORKOUT_CATEGORIES,
  WORKOUT_OPTIONS,
  workoutCategoryIcons,
  workoutCategoryLabels,
  type WorkoutCategory,
} from "@/lib/workout-options";
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

  const [category, setCategory] = useState<WorkoutCategory | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(todayEntry?.duration_minutes?.toString() ?? "");
  const [distanceKm, setDistanceKm] = useState(todayEntry?.distance_km?.toString() ?? "");
  const [caloriesBurned, setCaloriesBurned] = useState(todayEntry?.calories_burned?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const isRun = category === "run";
  const dirty = isRun ? Boolean(duration || distanceKm || caloriesBurned) : selectedExercises.size > 0;

  function toggleExercise(name: string) {
    setSelectedExercises((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleSave() {
    if (!category || !dirty) return;
    setSaving(true);
    try {
      const formData = new FormData();
      if (isRun) {
        formData.set("workout", "Run");
        formData.set("durationMinutes", duration);
        formData.set("distanceKm", distanceKm);
        formData.set("caloriesBurned", caloriesBurned);
      } else {
        formData.set("workout", `${workoutCategoryLabels[category]} — ${[...selectedExercises].join(", ")}`);
        formData.set("durationMinutes", duration);
      }
      await saveWorkoutEntry(formData);
      showAffirmation();
      setSelectedExercises(new Set());
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
      {todayEntry && (
        <p className="text-sm text-foreground">
          Logged today: <span className="font-medium">{todayEntry.workout}</span>
          {todayEntry.duration_minutes != null && <span className="text-ink-muted"> · {todayEntry.duration_minutes}m</span>}
          {todayEntry.distance_km != null && <span className="text-ink-muted"> · {todayEntry.distance_km}km</span>}
          {todayEntry.calories_burned != null && (
            <span className="text-ink-muted"> · {todayEntry.calories_burned}kcal</span>
          )}
        </p>
      )}

      <div className={cn("grid gap-4", todayEntry && "mt-6 border-t border-black/10 pt-6")}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Category</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WORKOUT_CATEGORIES.map((value) => {
              const Icon = workoutCategoryIcons[value];
              const active = category === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setCategory(value);
                    setSelectedExercises(new Set());
                  }}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-black/10 text-ink-muted hover:border-black/25"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {workoutCategoryLabels[value]}
                </button>
              );
            })}
          </div>
        </div>

        {category && !isRun && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Exercises — pick everything you did
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {WORKOUT_OPTIONS[category].map((option) => {
                const Icon = workoutCategoryIcons[category];
                const active = selectedExercises.has(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleExercise(option)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-black/10 text-ink-muted hover:border-black/25"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isRun ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-32">
              <label htmlFor="run-duration" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Minutes
              </label>
              <Input
                id="run-duration"
                type="number"
                min={0}
                inputMode="numeric"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder="30"
                className="mt-2"
              />
            </div>
            <div className="w-32">
              <label htmlFor="run-distance" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Km
              </label>
              <Input
                id="run-distance"
                type="number"
                min={0}
                step="0.1"
                inputMode="decimal"
                value={distanceKm}
                onChange={(event) => setDistanceKm(event.target.value)}
                placeholder="5"
                className="mt-2"
              />
            </div>
            <div className="w-32">
              <label htmlFor="run-calories" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Kcal burned
              </label>
              <Input
                id="run-calories"
                type="number"
                min={0}
                inputMode="numeric"
                value={caloriesBurned}
                onChange={(event) => setCaloriesBurned(event.target.value)}
                placeholder="300"
                className="mt-2"
              />
            </div>
            {dirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save"}
              </button>
            )}
          </div>
        ) : (
          category && (
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
                  disabled={saving}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save"}
                </button>
              )}
            </div>
          )
        )}
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
                {entry.distance_km != null && (
                  <span className="shrink-0 text-xs text-ink-muted">{entry.distance_km}km</span>
                )}
                {entry.calories_burned != null && (
                  <span className="shrink-0 text-xs text-ink-muted">{entry.calories_burned}kcal</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Accordion>
  );
}
