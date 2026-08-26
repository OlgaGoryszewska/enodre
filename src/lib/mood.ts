export type MoodEntry = {
  id: string;
  created_at: string;
  updated_at: string;
  entry_date: string;
  mood: number;
  note: string | null;
};

export const MOOD_OPTIONS = [
  { value: 1, emoji: "😞", label: "Very low" },
  { value: 2, emoji: "🙁", label: "Low" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

export function moodEmoji(mood: number) {
  return MOOD_OPTIONS.find((option) => option.value === mood)?.emoji ?? "•";
}

export function moodLabel(mood: number) {
  return MOOD_OPTIONS.find((option) => option.value === mood)?.label ?? "";
}
