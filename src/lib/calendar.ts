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
