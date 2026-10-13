import { z } from "zod";
import { ACCOUNTING_SYSTEM_VALUES, BEST_CHANNEL_VALUES, SEGMENT_VALUES } from "@/lib/potential-customer";

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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

// The GTM fields edited in the lead's Details dialog. Empty inputs become null.
export const potentialCustomerDetailsSchema = z.object({
  segment: z.enum(SEGMENT_VALUES).nullable(),
  employees: z.number().int().min(0).nullable(),
  location: optionalText(120),
  org_number: optionalText(20),
  website: optionalText(300),
  best_channel: z.enum(BEST_CHANNEL_VALUES).nullable(),
  opener_fact: optionalText(1000),
  opener_source: optionalText(500),
  accounting_system: z.enum(ACCOUNTING_SYSTEM_VALUES).nullable(),
  admin_hours_per_week: z.number().min(0).max(200).nullable(),
  main_pain: optionalText(1000),
  first_contacted_on: z.iso.date().nullable(),
});

export type PotentialCustomerDetails = z.input<typeof potentialCustomerDetailsSchema>;
