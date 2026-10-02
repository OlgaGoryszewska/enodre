import { z } from "zod";

export const marketingTaskFormSchema = z.object({
  title: z.string().min(1, "Give the task a title."),
  description: z.string().optional(),
});

export type MarketingTaskFormValues = z.infer<typeof marketingTaskFormSchema>;
