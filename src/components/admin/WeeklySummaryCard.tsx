import { CalendarRange } from "lucide-react";
import { moodLabel, type MoodEntry } from "@/lib/mood";
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

// A plain recap of the daily trackers + task board over the last 7 days —
// server-rendered, no interactivity needed, so no "use client" here.
export function WeeklySummaryCard({ moodEntries, calorieEntries, workoutEntries, tasks }: WeeklySummaryCardProps) {
  const cutoffKey = sevenDayCutoffKey();
  const cutoffISO = sevenDayCutoffISO();

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
    </div>
  );
}
