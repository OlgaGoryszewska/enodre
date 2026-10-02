import { z } from "zod";

export const potentialCustomerFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  company: z.string().optional(),
  email: z
    .string()
    .email("That doesn't look like a valid email address.")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
});

export type PotentialCustomerFormValues = z.infer<typeof potentialCustomerFormSchema>;
