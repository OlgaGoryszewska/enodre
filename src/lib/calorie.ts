export type CalorieEntry = {
  id: string;
  created_at: string;
  updated_at: string;
  entry_date: string;
  calories: number;
  calories_burned: number | null;
  note: string | null;
};
