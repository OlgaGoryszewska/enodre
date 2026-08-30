import { z } from "zod";

export const calorieFormSchema = z.object({
  calories: z.number().int().min(0, { error: "Enter a positive number." }),
  caloriesBurned: z.number().int().min(0).optional(),
  note: z.string().optional(),
});

export type CalorieFormValues = z.infer<typeof calorieFormSchema>;
