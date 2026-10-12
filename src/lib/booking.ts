// Shared by the public booking API and BookingCalendar.
// Keep these rules in sync with public.book_call in supabase/bookings.sql,
// which re-checks them because the anon key can call it directly.
export const BOOKING_CONFIG = {
  timeZone: "Europe/Oslo",
  // ISO weekdays: 1 = Monday … 7 = Sunday
  workDays: [1, 2, 3, 4, 5],
  dayStartMinutes: 7 * 60,
  dayEndMinutes: 19 * 60,
  slotMinutes: 30,
  minNoticeHours: 12,
  horizonDays: 21,
} as const;

export interface BookingSlot {
  start: string;
  end: string;
}

/** Offset of `timeZone` from UTC at `date`, in ms (positive east of UTC). */
function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Wall-clock time in `timeZone` -> the matching UTC instant, DST-aware. */
function zonedTimeToUtc(year: number, month: number, day: number, minutes: number, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day, 0, minutes);
  const firstOffset = timeZoneOffsetMs(new Date(guess), timeZone);
  let result = guess - firstOffset;
  const secondOffset = timeZoneOffsetMs(new Date(result), timeZone);
  if (secondOffset !== firstOffset) result = guess - secondOffset;
  return new Date(result);
}

function zonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Every slot inside working hours and the booking window, before removing busy times. */
export function generateCandidateSlots(now = new Date()): BookingSlot[] {
  const { timeZone, workDays, dayStartMinutes, dayEndMinutes, slotMinutes, minNoticeHours, horizonDays } =
    BOOKING_CONFIG;
  const earliest = now.getTime() + minNoticeHours * 60 * 60 * 1000;
  const today = zonedDateParts(now, timeZone);
  const slots: BookingSlot[] = [];

  for (let offset = 0; offset <= horizonDays; offset++) {
    // Calendar arithmetic on a UTC date is safe — only y/m/d/weekday are read.
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const isoWeekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    if (!(workDays as readonly number[]).includes(isoWeekday)) continue;

    for (let minutes = dayStartMinutes; minutes + slotMinutes <= dayEndMinutes; minutes += slotMinutes) {
      const start = zonedTimeToUtc(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        minutes,
        timeZone
      );
      if (start.getTime() < earliest) continue;
      const end = new Date(start.getTime() + slotMinutes * 60 * 1000);
      slots.push({ start: start.toISOString(), end: end.toISOString() });
    }
  }

  return slots;
}

export function removeBusySlots(
  slots: BookingSlot[],
  busy: { start_time: string; end_time: string }[]
): BookingSlot[] {
  const busyRanges = busy.map((range) => [Date.parse(range.start_time), Date.parse(range.end_time)] as const);
  return slots.filter((slot) => {
    const start = Date.parse(slot.start);
    const end = Date.parse(slot.end);
    return !busyRanges.some(([busyStart, busyEnd]) => start < busyEnd && end > busyStart);
  });
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
