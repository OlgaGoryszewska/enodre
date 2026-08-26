import { z } from "zod";

export const URGENCY_VALUES = ["exploring", "6-months", "3-months", "now"] as const;

export type UrgencyValue = (typeof URGENCY_VALUES)[number];

export const urgencyOptions: { value: UrgencyValue; label: string }[] = [
  { value: "exploring", label: "Just exploring" },
  { value: "6-months", label: "Within the next 6 months" },
  { value: "3-months", label: "Within the next 3 months" },
  { value: "now", label: "We need help now" },
];

export function urgencyLabel(value: string) {
  return urgencyOptions.find((option) => option.value === value)?.label ?? value;
}

export const challengeFormSchema = z.object({
  fullName: z
    .string()
    .min(2, "Let us know who we're speaking with.")
    .max(120, "That name looks a little long — mind shortening it?"),
  company: z.string().max(160).optional(),
  email: z
    .string()
    .min(1, "We'll need an email so we can get back to you.")
    .email("That doesn't look like a valid email address."),
  challenge: z
    .string()
    .min(30, "A few more sentences will help us understand what's going on.")
    .max(4000),
  successLooksLike: z.string().max(4000).optional(),
  urgency: z.enum(URGENCY_VALUES, {
    error: "Choose the option that fits best.",
  }),
  anythingElse: z.string().max(4000).optional(),
  // Honeypot — real visitors never see or fill this field. Left as a plain
  // optional string (no validation constraints) so a bot filling it doesn't
  // trip a validation error that would reveal the mechanism; the submit
  // route checks it manually and silently no-ops if it's non-empty.
  website: z.string().optional(),
});

export type ChallengeFormValues = z.infer<typeof challengeFormSchema>;
