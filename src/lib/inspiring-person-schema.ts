import { z } from "zod";

export const inspiringPersonFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  reason: z.string().optional(),
  url: z.string().url("Enter a valid URL.").optional().or(z.literal("")),
});

export type InspiringPersonFormValues = z.infer<typeof inspiringPersonFormSchema>;
