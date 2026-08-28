import { z } from "zod";

export const workoutFormSchema = z.object({
  workout: z.string().min(1, { error: "Describe today's workout." }),
  durationMinutes: z.number().int().min(0).optional(),
});

export type WorkoutFormValues = z.infer<typeof workoutFormSchema>;
