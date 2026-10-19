import { z } from "zod";
import { BEST_CHANNEL_VALUES, SEGMENT_VALUES } from "@/lib/potential-customer";

export const potentialCustomerFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  company: z.string().optional(),
  email: z.string().email("That doesn't look like a valid email address.").optional().or(z.literal("")),
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
// Discovery answers (accounting system, hours, pain) are recorded per call in
// discovery_calls, not here.
export const potentialCustomerDetailsSchema = z.object({
  segment: z.enum(SEGMENT_VALUES).nullable(),
  employees: z.number().int().min(0).nullable(),
  location: optionalText(120),
  org_number: optionalText(20),
  website: optionalText(300),
  best_channel: z.enum(BEST_CHANNEL_VALUES).nullable(),
  opener_fact: optionalText(1000),
  opener_source: optionalText(500),
  first_contacted_on: z.iso.date().nullable(),
  // Optional: these columns only exist once gtm_command_centre.sql has run.
  next_follow_up_on: z.iso.date().nullable().optional(),
  next_action: optionalText(300).optional(),
});

export type PotentialCustomerDetails = z.input<typeof potentialCustomerDetailsSchema>;
