import { CalendarRange } from "lucide-react";
import { moodEmoji, moodLabel, type MoodEntry } from "@/lib/mood";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";
import type { Task } from "@/lib/task";

interface WeeklySummaryCardProps {
  moodEntries: MoodEntry[];
  calorieEntries: CalorieEntry[];
  workoutEntries: WorkoutEntry[];
  tasks: Task[];
}

const CALORIE_GOAL = 1700;

function sevenDayCutoffKey() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function sevenDayCutoffISO() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

// Oldest to newest, today last — every one of the 7 calendar days, not just
// the ones with an entry, so a day with nothing logged shows as a real gap
// rather than silently shrinking the week.
function lastSevenDays() {
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
    });
  }
  return days;
}

type BarPoint = { key: string; label: string; value: number | null; display: string };

// A single flat accent hue per chart (each is one series, so per the dataviz
// house rules a legend isn't needed — the title already names the metric).
// Missing days render as a thin muted tick instead of a zero-height bar, so
// "no entry" reads differently from "entry of zero."
function MiniBarChart({
  points,
  max,
  goalLine,
  goalLabel,
}: {
  points: BarPoint[];
  max: number;
  goalLine?: number;
  goalLabel?: string;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-end gap-1.5">
        {points.map((point) => {
          const hasValue = point.value != null;
          const heightPct = hasValue ? Math.min(Math.max((point.value! / max) * 100, 6), 100) : 0;
          return (
            <div key={point.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="group relative flex h-16 w-full items-end justify-center">
                {goalLine != null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-foreground/20"
                    style={{ bottom: `${Math.min((goalLine / max) * 100, 100)}%` }}
                  />
                )}
                {hasValue ? (
                  <div
                    className="w-full max-w-6 rounded-t-sm bg-accent transition-opacity group-hover:opacity-80"
                    style={{ height: `${heightPct}%` }}
                  />
                ) : (
                  <div className="h-1 w-full max-w-6 rounded-full bg-black/10" />
                )}
                <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                  {point.display}
                </span>
              </div>
              <span className="text-[10px] font-medium text-ink-muted">{point.label}</span>
            </div>
          );
        })}
      </div>
      {goalLine != null && goalLabel && <p className="mt-2 text-[11px] text-ink-muted">- - - {goalLabel}</p>}
    </div>
  );
}

// A plain recap of the daily trackers + task board over the last 7 days —
// server-rendered, no interactivity needed, so no "use client" here.
export function WeeklySummaryCard({ moodEntries, calorieEntries, workoutEntries, tasks }: WeeklySummaryCardProps) {
  const cutoffKey = sevenDayCutoffKey();
  const cutoffISO = sevenDayCutoffISO();
  const days = lastSevenDays();

  const weekMood = moodEntries.filter((entry) => entry.entry_date >= cutoffKey);
  const weekCalories = calorieEntries.filter((entry) => entry.entry_date >= cutoffKey);
  const weekWorkouts = workoutEntries.filter((entry) => entry.entry_date >= cutoffKey);
  const weekDoneTasks = tasks.filter((task) => task.status === "done" && task.updated_at >= cutoffISO);

  const avgMood = weekMood.length
    ? Math.round(weekMood.reduce((sum, entry) => sum + entry.mood, 0) / weekMood.length)
    : null;
  const daysUnderGoal = weekCalories.filter((entry) => entry.calories <= CALORIE_GOAL).length;

  const stats = [
    {
      label: "Mood",
      value: avgMood ? moodLabel(avgMood) : "—",
      hint: weekMood.length ? `${weekMood.length} of 7 days logged` : "No entries yet",
    },
    {
      label: "Calories",
      value: `${daysUnderGoal}/7`,
      hint: weekCalories.length
        ? `Under ${CALORIE_GOAL.toLocaleString()} kcal (${weekCalories.length} logged)`
        : "No entries yet",
    },
    {
      label: "Workouts",
      value: `${weekWorkouts.length}/7`,
      hint: "Days logged",
    },
    {
      label: "Tasks",
      value: String(weekDoneTasks.length),
      hint: "Completed this week",
    },
  ];

  const moodPoints: BarPoint[] = days.map((day) => {
    const entry = weekMood.find((e) => e.entry_date === day.key);
    return {
      key: day.key,
      label: day.label,
      value: entry ? entry.mood : null,
      display: entry ? `${moodEmoji(entry.mood)} ${moodLabel(entry.mood)}` : "No entry",
    };
  });

  const calorieValues = weekCalories.map((entry) => entry.calories);
  const calorieMax = Math.max(CALORIE_GOAL * 1.3, ...calorieValues, 1);
  const caloriePoints: BarPoint[] = days.map((day) => {
    const entry = weekCalories.find((e) => e.entry_date === day.key);
    return {
      key: day.key,
      label: day.label,
      value: entry ? entry.calories : null,
      display: entry ? `${entry.calories.toLocaleString()} kcal` : "No entry",
    };
  });

  const workoutDurations = weekWorkouts.map((entry) => entry.duration_minutes ?? 1);
  const workoutMax = Math.max(60, ...workoutDurations, 1);
  const workoutPoints: BarPoint[] = days.map((day) => {
    const entry = weekWorkouts.find((e) => e.entry_date === day.key);
    return {
      key: day.key,
      label: day.label,
      value: entry ? (entry.duration_minutes ?? 1) : null,
      display: entry ? (entry.duration_minutes != null ? `${entry.duration_minutes} min` : "Logged") : "No entry",
    };
  });

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"
          aria-hidden="true"
        >
          <CalendarRange className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">This week</h2>
          <p className="text-sm text-ink-muted">A summary of the last 7 days</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-black/10 bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 border-t border-black/10 pt-6 sm:grid-cols-3">
        <div className="rounded-xl border border-black/10 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Mood</p>
          <MiniBarChart points={moodPoints} max={5} />
        </div>
        <div className="rounded-xl border border-black/10 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Calories</p>
          <MiniBarChart
            points={caloriePoints}
            max={calorieMax}
            goalLine={CALORIE_GOAL}
            goalLabel={`${CALORIE_GOAL.toLocaleString()} kcal goal`}
          />
        </div>
        <div className="rounded-xl border border-black/10 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Workout minutes</p>
          <MiniBarChart points={workoutPoints} max={workoutMax} />
        </div>
      </div>
    </div>
  );
}
