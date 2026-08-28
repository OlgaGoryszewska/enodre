import type { JournalEntry } from "@/lib/journal";
import type { CalorieEntry } from "@/lib/calorie";
import type { WorkoutEntry } from "@/lib/workout";

export type WellnessMarker = {
  date: string;
  label: string;
};

// Combines the three daily wellness trackers into one read-only marker per
// date, so logging a journal/calorie/workout entry is visible on the
// calendar without needing its own editable calendar event type.
export function buildWellnessMarkers(
  journalEntries: JournalEntry[],
  calorieEntries: CalorieEntry[],
  workoutEntries: WorkoutEntry[]
): WellnessMarker[] {
  const iconsByDate = new Map<string, string[]>();

  const add = (date: string, icon: string) => {
    const icons = iconsByDate.get(date) ?? [];
    icons.push(icon);
    iconsByDate.set(date, icons);
  };

  journalEntries.forEach((entry) => add(entry.entry_date, "📓"));
  calorieEntries.forEach((entry) => add(entry.entry_date, "🍎"));
  workoutEntries.forEach((entry) => add(entry.entry_date, "🏋️"));

  return [...iconsByDate.entries()].map(([date, icons]) => ({
    date,
    label: icons.join(" "),
  }));
}
