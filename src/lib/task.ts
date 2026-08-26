export const TASK_STATUS_VALUES = ["todo", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

export const taskStatusLabels: Record<TaskStatus, string> = {
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
};
