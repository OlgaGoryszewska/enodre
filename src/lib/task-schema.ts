import { z } from "zod";

export const taskFormSchema = z
  .object({
    title: z.string().min(1, "Give the task a title."),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    repeatDaily: z.boolean(),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate),
    { message: "Finish date must be on or after the start date.", path: ["endDate"] }
  );

export type TaskFormValues = z.infer<typeof taskFormSchema>;
