"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  Clock,
  Loader2,
} from "lucide-react";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BookingSlot } from "@/lib/booking";
import {
  bookingDetailsSchema,
  type BookingDetailsValues,
  type BookingLocale,
} from "@/lib/booking-schema";

const DATE_LOCALE: Record<BookingLocale, string> = {
  en: "en-GB",
  pl: "pl-PL",
  no: "nb-NO",
};

const T = {
  en: {
    pickDay: "Pick a day",
    pickTime: "Pick a time",
    duration: "30-minute call",
    timeZoneNote: "Times are shown in your time zone",
    loading: "Loading available times...",
    loadError:
      "We couldn't load the calendar. Please try again, or send us a message instead.",
    retry: "Try again",
    noSlots:
      "No free times in the next few weeks. Send us a message and we'll find a time.",
    back: "Change time",
    fullName: "Full Name",
    email: "Email",
    company: "Company",
    note: "What would you like to talk about?",
    notePlaceholder: "A sentence or two is plenty.",
    booking: "Booking...",
    book: "Book the call",
    taken: "Someone just booked that time. Please pick another one.",
    error:
      "Something went wrong booking your call. Please try again, or email us directly.",
    doneTitle: "You're booked.",
    doneBody:
      "We've emailed a confirmation with a calendar invite. A video-call link will follow before the call.",
    bookAnother: "Book another time",
  },
  pl: {
    pickDay: "Wybierz dzień",
    pickTime: "Wybierz godzinę",
    duration: "Rozmowa 30-minutowa",
    timeZoneNote: "Godziny w Twojej strefie czasowej",
    loading: "Ładowanie dostępnych terminów...",
    loadError:
      "Nie udało się załadować kalendarza. Spróbuj ponownie lub wyślij nam wiadomość.",
    retry: "Spróbuj ponownie",
    noSlots:
      "Brak wolnych terminów w najbliższych tygodniach. Napisz do nas, a znajdziemy termin.",
    back: "Zmień termin",
    fullName: "Imię i nazwisko",
    email: "E-mail",
    company: "Firma",
    note: "O czym chcesz porozmawiać?",
    notePlaceholder: "Wystarczy jedno lub dwa zdania.",
    booking: "Rezerwowanie...",
    book: "Zarezerwuj rozmowę",
    taken: "Ktoś właśnie zarezerwował ten termin. Wybierz inny.",
    error:
      "Coś poszło nie tak podczas rezerwacji. Spróbuj ponownie lub napisz do nas bezpośrednio.",
    doneTitle: "Rozmowa zarezerwowana.",
    doneBody:
      "Wysłaliśmy potwierdzenie z zaproszeniem do kalendarza. Link do wideorozmowy prześlemy przed spotkaniem.",
    bookAnother: "Zarezerwuj inny termin",
  },
  no: {
    pickDay: "Velg dag",
    pickTime: "Velg tidspunkt",
    duration: "Samtale på 30 minutter",
    timeZoneNote: "Tidene vises i din tidssone",
    loading: "Henter ledige tider...",
    loadError:
      "Vi fikk ikke lastet kalenderen. Prøv igjen, eller send oss en melding.",
    retry: "Prøv igjen",
    noSlots:
      "Ingen ledige tider de neste ukene. Send oss en melding, så finner vi et tidspunkt.",
    back: "Endre tidspunkt",
    fullName: "Fullt navn",
    email: "E-post",
    company: "Bedrift",
    note: "Hva vil du snakke om?",
    notePlaceholder: "En setning eller to holder.",
    booking: "Bestiller...",
    book: "Bestill samtalen",
    taken: "Noen bestilte akkurat det tidspunktet. Velg et annet.",
    error:
      "Noe gikk galt under bestillingen. Prøv igjen, eller send oss en e-post direkte.",
    doneTitle: "Samtalen er bestilt.",
    doneBody:
      "Vi har sendt en bekreftelse med kalenderinvitasjon. Lenke til videosamtalen kommer før samtalen.",
    bookAnother: "Bestill et annet tidspunkt",
  },
};

async function fetchSlots() {
  const response = await fetch("/api/booking/slots", { cache: "no-store" });
  if (!response.ok) throw new Error("Request failed");
  const data = (await response.json()) as { slots: BookingSlot[] };
  return data.slots;
}

type LoadState = "loading" | "ready" | "error";
type SubmitState = "idle" | "taken" | "error" | "success";

export function BookingCalendar({ locale = "en" }: { locale?: BookingLocale }) {
  const t = T[locale];
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const dayKeyFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [timeZone],
  );
  const weekdayFormat = useMemo(
    () => new Intl.DateTimeFormat(DATE_LOCALE[locale], { weekday: "short" }),
    [locale],
  );
  const dayFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(DATE_LOCALE[locale], {
        day: "numeric",
        month: "short",
      }),
    [locale],
  );
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(DATE_LOCALE[locale], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );
  const longFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(DATE_LOCALE[locale], {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  // Group slots by the visitor's local date, keeping chronological order.
  const days = useMemo(() => {
    const groups = new Map<string, BookingSlot[]>();
    for (const slot of slots) {
      const key = dayKeyFormat.format(new Date(slot.start));
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups.entries()].map(([key, daySlots]) => ({
      key,
      slots: daySlots,
    }));
  }, [slots, dayKeyFormat]);

  // State is only set in the promise callbacks, so this is safe to call from
  // the mount effect. Callers that want the spinner set "loading" themselves.
  const loadSlots = useCallback(() => {
    return fetchSlots().then(
      (freeSlots) => {
        setSlots(freeSlots);
        setLoadState("ready");
      },
      () => setLoadState("error"),
    );
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingDetailsValues>({
    resolver: zodResolver(bookingDetailsSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      email: "",
      company: "",
      note: "",
      website: "",
    },
  });

  async function onSubmit(values: BookingDetailsValues) {
    if (!selectedSlot) return;
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          start: selectedSlot.start,
          timeZone,
          locale,
        }),
      });

      if (response.status === 409) {
        setSubmitState("taken");
        setSelectedSlot(null);
        void loadSlots();
        return;
      }
      if (!response.ok) throw new Error("Request failed");

      setSubmitState("success");
      reset();
    } catch {
      setSubmitState("error");
    }
  }

  if (submitState === "success" && selectedSlot) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-5 py-10 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
          <CalendarCheck className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-tight">
            {t.doneTitle}
          </h3>
          <p className="font-medium text-foreground">
            {longFormat.format(new Date(selectedSlot.start))}
          </p>
          <p className="mx-auto max-w-sm leading-7 text-ink-muted">
            {t.doneBody}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSubmitState("idle");
            setSelectedSlot(null);
            void loadSlots();
          }}
          className="text-sm font-semibold text-accent transition hover:underline"
        >
          {t.bookAnother}
        </button>
      </motion.div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{t.loading}</span>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="grid gap-4 rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
        <p>{t.loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoadState("loading");
            void loadSlots();
          }}
          className="font-semibold text-foreground hover:underline"
        >
          {t.retry}
        </button>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
        {t.noSlots}
      </p>
    );
  }

  // Falls back to the first day with free times — also covers the selected
  // day disappearing after a reload.
  const activeDay = days.find((day) => day.key === selectedDay) ?? days[0];

  return (
    <AnimatePresence mode="wait" initial={false}>
      {selectedSlot ? (
        <motion.form
          key="details"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2 }}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock
                className="h-4 w-4 shrink-0 text-ink-muted"
                aria-hidden="true"
              />
              {longFormat.format(new Date(selectedSlot.start))}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedSlot(null);
                setSubmitState("idle");
              }}
              className="flex items-center gap-1 text-sm font-semibold text-ink-muted transition hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t.back}
            </button>
          </div>

          {/* Honeypot — same as ChallengeForm. */}
          <div
            aria-hidden="true"
            className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="booking-website">Website</label>
            <input
              id="booking-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register("website")}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              id="booking-fullName"
              label={t.fullName}
              required
              error={errors.fullName?.message}
            >
              <Input
                id="booking-fullName"
                placeholder="John Smith"
                autoComplete="name"
                {...register("fullName")}
              />
            </FormField>
            <FormField
              id="booking-email"
              label={t.email}
              required
              error={errors.email?.message}
            >
              <Input
                id="booking-email"
                type="email"
                placeholder="john@company.com"
                autoComplete="email"
                {...register("email")}
              />
            </FormField>
          </div>

          <FormField
            id="booking-company"
            label={t.company}
            error={errors.company?.message}
          >
            <Input
              id="booking-company"
              autoComplete="organization"
              {...register("company")}
            />
          </FormField>

          <FormField
            id="booking-note"
            label={t.note}
            error={errors.note?.message}
          >
            <Textarea
              id="booking-note"
              rows={3}
              placeholder={t.notePlaceholder}
              {...register("note")}
            />
          </FormField>

          <AnimatePresence>
            {submitState === "error" && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.2 }}
                role="alert"
                className="flex items-center gap-2 overflow-hidden rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full justify-center rounded-full bg-foreground text-background hover:opacity-90",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>{t.booking}</span>
              </>
            ) : (
              <span>{t.book}</span>
            )}
          </button>
        </motion.form>
      ) : (
        <motion.div
          key="pick"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="grid gap-6"
        >
          {submitState === "taken" && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.taken}</span>
            </div>
          )}

          <div className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{t.pickDay}</p>
              <p className="text-xs text-ink-muted">{t.duration}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {days.map((day) => {
                const date = new Date(day.slots[0].start);
                const isActive = day.key === activeDay.key;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDay(day.key)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition",
                      isActive
                        ? "border-foreground bg-foreground text-background"
                        : "border-black/10 bg-background text-foreground hover:border-black/30",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs capitalize",
                        isActive ? "text-background/70" : "text-ink-muted",
                      )}
                    >
                      {weekdayFormat.format(date)}
                    </span>
                    <span className="text-sm font-semibold">
                      {dayFormat.format(date)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-medium text-foreground">{t.pickTime}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {activeDay.slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    setSubmitState("idle");
                  }}
                  className="rounded-full border border-black/10 bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  {timeFormat.format(new Date(slot.start))}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted">
              {t.timeZoneNote}: {timeZone}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
