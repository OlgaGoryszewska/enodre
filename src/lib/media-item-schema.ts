import { z } from "zod";

export const mediaItemFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  category: z.string().optional(),
  url: z.string().url("Enter a valid URL.").optional().or(z.literal("")),
});

export type MediaItemFormValues = z.infer<typeof mediaItemFormSchema>;
