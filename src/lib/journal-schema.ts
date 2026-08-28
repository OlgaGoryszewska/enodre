import { z } from "zod";

export const journalFormSchema = z.object({
  entry: z.string().min(1, { error: "Write something first." }),
});

export type JournalFormValues = z.infer<typeof journalFormSchema>;
