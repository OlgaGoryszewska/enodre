import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { BOOKING_CONFIG, generateCandidateSlots, isValidTimeZone } from "@/lib/booking";
import { bookingRequestSchema, type BookingLocale } from "@/lib/booking-schema";

const RECIPIENT = "info@enodre.com";
const PUBLIC_CONTACT = RECIPIENT;

const DATE_LOCALE: Record<BookingLocale, string> = { en: "en-GB", pl: "pl-PL", no: "nb-NO" };

const EMAIL_T: Record<BookingLocale, { subject: string; greeting: (name: string) => string; body: string; when: string; link: string; change: string; signoff: string }> = {
  en: {
    subject: "Your call with Enodre is booked",
    greeting: (name) => `Hi ${name},`,
    body: "Thanks for booking a call with Enodre. Here are the details:",
    when: "When",
    link: "We'll email you a video-call link before the call.",
    change: `Need to change or cancel? Just reply to this email or write to ${PUBLIC_CONTACT}.`,
    signoff: "Talk soon,\nEnodre",
  },
  pl: {
    subject: "Twoja rozmowa z Enodre jest zarezerwowana",
    greeting: (name) => `Cześć ${name},`,
    body: "Dziękujemy za umówienie rozmowy z Enodre. Oto szczegóły:",
    when: "Termin",
    link: "Przed rozmową wyślemy Ci link do wideorozmowy.",
    change: `Chcesz zmienić termin lub odwołać? Odpowiedz na tego maila lub napisz na ${PUBLIC_CONTACT}.`,
    signoff: "Do usłyszenia,\nEnodre",
  },
  no: {
    subject: "Samtalen din med Enodre er bestilt",
    greeting: (name) => `Hei ${name},`,
    body: "Takk for at du bestilte en samtale med Enodre. Her er detaljene:",
    when: "Tidspunkt",
    link: "Vi sender deg en lenke til videosamtalen før samtalen.",
    change: `Må du endre eller avlyse? Svar på denne e-posten eller skriv til ${PUBLIC_CONTACT}.`,
    signoff: "Snakkes,\nEnodre",
  },
};

function formatWhen(start: Date, end: Date, timeZone: string, locale: BookingLocale) {
  const dateFormat = new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFormat = new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateFormat.format(start)}, ${timeFormat.format(start)}–${timeFormat.format(end)} (${timeZone})`;
}

function icsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs(bookingId: string, start: Date, end: Date) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Enodre//Booking//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${bookingId}@enodre.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    "SUMMARY:Call with Enodre",
    `DESCRIPTION:Video-call link will be sent by email. Questions: ${PUBLIC_CONTACT}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid booking." }, { status: 400 });
  }

  // Honeypot — fake success with no side effects, as in /api/challenge.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const { fullName, email, company, note, start, timeZone, locale = "en" } = parsed.data;
  const visitorTimeZone = timeZone && isValidTimeZone(timeZone) ? timeZone : BOOKING_CONFIG.timeZone;

  // Reject anything that isn't one of the currently offered slots. book_call
  // re-checks this in the database too.
  const slot = generateCandidateSlots().find((candidate) => Date.parse(candidate.start) === Date.parse(start));
  if (!slot) {
    return NextResponse.json({ ok: false, error: "That time isn't available." }, { status: 409 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY env vars — booking not saved.");
    return NextResponse.json({ ok: false, error: "Booking is unavailable." }, { status: 500 });
  }

  // Unlike /api/challenge, the database write is required here: it's what
  // reserves the slot, so a booking that isn't saved hasn't happened.
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: bookingId, error } = await supabase.rpc("book_call", {
    p_full_name: fullName,
    p_email: email,
    p_company: company || null,
    p_note: note || null,
    p_start: slot.start,
    p_end: slot.end,
  });

  if (error) {
    if (error.message.includes("slot_taken") || error.message.includes("invalid_slot")) {
      return NextResponse.json({ ok: false, error: "That time isn't available." }, { status: 409 });
    }
    console.error("Failed to save booking to Supabase:", error);
    return NextResponse.json({ ok: false, error: "Failed to book." }, { status: 500 });
  }

  // Emails are notifications only — the booking already exists, so their
  // failure is logged but doesn't fail the request.
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("Missing GMAIL_USER / GMAIL_APP_PASSWORD env vars — booking emails not sent.");
  } else {
    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    const ownerText = [
      `When: ${formatWhen(startDate, endDate, BOOKING_CONFIG.timeZone, "en")}`,
      `Visitor's time zone: ${visitorTimeZone}`,
      `Name: ${fullName}`,
      company && `Company: ${company}`,
      `Email: ${email}`,
      note && ["", "Note:", note].join("\n"),
      "",
      "It's on /admin/calendar. Send them a video-call link.",
    ]
      .filter(Boolean)
      .join("\n");

    const t = EMAIL_T[locale];
    const visitorText = [
      t.greeting(fullName),
      "",
      t.body,
      "",
      `${t.when}: ${formatWhen(startDate, endDate, visitorTimeZone, locale)}`,
      "",
      t.link,
      t.change,
      "",
      t.signoff,
    ].join("\n");

    const results = await Promise.allSettled([
      transporter.sendMail({
        from: `"Enodre website" <${gmailUser}>`,
        to: RECIPIENT,
        replyTo: email,
        subject: `New call booked — ${fullName}, ${formatWhen(startDate, endDate, BOOKING_CONFIG.timeZone, "en")}`,
        text: ownerText,
      }),
      transporter.sendMail({
        from: `"Enodre" <${gmailUser}>`,
        to: email,
        replyTo: PUBLIC_CONTACT,
        subject: t.subject,
        text: visitorText,
        icalEvent: {
          filename: "enodre-call.ics",
          method: "PUBLISH",
          content: buildIcs(String(bookingId), startDate, endDate),
        },
      }),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Failed to send booking email:", result.reason);
      }
    }
  }

  return NextResponse.json({ ok: true, start: slot.start, end: slot.end });
}
