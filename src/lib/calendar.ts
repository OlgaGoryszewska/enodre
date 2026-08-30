export type CalendarEvent = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
};

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
