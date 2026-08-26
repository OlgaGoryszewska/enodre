import { z } from "zod";

export const eventFormSchema = z
  .object({
    title: z.string().min(1, "Give the event a title."),
    description: z.string().optional(),
    startTime: z.string().min(1, "Choose a start time."),
    endTime: z.string().min(1, "Choose an end time."),
    allDay: z.boolean(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "End time must be after the start time.",
    path: ["endTime"],
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
