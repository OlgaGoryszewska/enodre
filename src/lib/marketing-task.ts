export const MARKETING_TASK_STATUS_VALUES = ["todo", "in_progress", "done"] as const;

export type MarketingTaskStatus = (typeof MARKETING_TASK_STATUS_VALUES)[number];

export const marketingTaskStatusLabels: Record<MarketingTaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export type MarketingTask = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  status: MarketingTaskStatus;
  position: number;
};
