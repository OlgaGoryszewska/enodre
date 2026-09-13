export const TASK_STATUS_VALUES = ["recurring", "todo", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

export const taskStatusLabels: Record<TaskStatus, string> = {
  recurring: "Recurring",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export type Task = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  start_date: string | null;
  end_date: string | null;
  repeat_daily: boolean;
  due_time: string | null;
};

// due_time comes back from Postgres as "HH:MM:SS" — format for display as
// a plain 12-hour time, e.g. "2:30 PM".
export function formatTaskTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
