import { z } from "zod";

export const BOOKING_LOCALES = ["en", "pl", "no"] as const;

export type BookingLocale = (typeof BOOKING_LOCALES)[number];

// The visitor-facing fields — what BookingCalendar's form validates.
export const bookingDetailsSchema = z.object({
  fullName: z
    .string()
    .min(2, "Let us know who we're speaking with.")
    .max(120, "That name looks a little long — mind shortening it?"),
  email: z
    .string()
    .min(1, "We'll need an email to send the confirmation.")
    .email("That doesn't look like a valid email address."),
  company: z.string().max(160).optional(),
  note: z.string().max(2000).optional(),
  // Honeypot — same approach as challengeFormSchema.
  website: z.string().optional(),
});

export type BookingDetailsValues = z.infer<typeof bookingDetailsSchema>;

// What the client POSTs to /api/booking.
export const bookingRequestSchema = bookingDetailsSchema.extend({
  start: z.iso.datetime(),
  timeZone: z.string().max(64).optional(),
  locale: z.enum(BOOKING_LOCALES).optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
