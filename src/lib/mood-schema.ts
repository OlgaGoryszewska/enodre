import { z } from "zod";

export const moodFormSchema = z.object({
  mood: z.number().int().min(1).max(5),
  note: z.string().optional(),
});

export type MoodFormValues = z.infer<typeof moodFormSchema>;
