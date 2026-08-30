import { z } from "zod";

export const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z
    .string()
    .email("That doesn't look like a valid email address.")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
