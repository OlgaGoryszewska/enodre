import { z } from "zod";

export const jobLeadFormSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  company: z.string().optional(),
  url: z.url({ error: "Enter a valid URL." }),
});

export type JobLeadFormValues = z.infer<typeof jobLeadFormSchema>;
