import { z } from "zod";

export const calorieFormSchema = z.object({
  calories: z.number().int().min(0, { error: "Enter a positive number." }),
  note: z.string().optional(),
});

export type CalorieFormValues = z.infer<typeof calorieFormSchema>;
