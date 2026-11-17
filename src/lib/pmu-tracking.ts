// Step-by-step tracking for PMU outreach: the history of each place, what to
// do next and when, the follow-up messages, and the overview numbers. Pure, so
// it's unit-tested; the page and server actions do the I/O.

import { PMU_PORTFOLIO, type PmuStatus, type PmuTarget } from "./pmu-agent.ts";

export const ACTIVITY_KINDS = [
  "email_sent",
  "whatsapp_sent",
  "form_sent",
  "instagram_sent",
  "called",
  "replied",
  "call_booked",
  "visit",
  "offer",
  "declined",
  "not_now",
  "note",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const activityLabels: Record<ActivityKind, string> = {
  email_sent: "Email sent",
  whatsapp_sent: "WhatsApp sent",
  form_sent: "Form sent",
  instagram_sent: "Instagram message sent",
  called: "Called",
  replied: "They replied",
  call_booked: "Call booked",
  visit: "Visit / trial day",
  offer: "Offer received",
  declined: "They said no",
  not_now: "Not now",
  note: "Note",
};

export type PmuActivity = {
  id: string;
  target_id: string;
  kind: ActivityKind;
  at: string;
  note: string | null;
};

/** Messages you sent, in any channel. */
export const OUTREACH: ActivityKind[] = ["email_sent", "whatsapp_sent", "form_sent", "instagram_sent", "called"];

/** The stage bar: the path a place moves along, in order. */
export const STAGES: { status: PmuStatus; label: string }[] = [
  { status: "to_contact", label: "To contact" },
  { status: "contacted", label: "Contacted" },
  { status: "followed_up", label: "Followed up" },
  { status: "replied", label: "Replied" },
  { status: "interview", label: "Call" },
  { status: "trial", label: "Visit" },
  { status: "offer", label: "Offer" },
  { status: "accepted", label: "Accepted" },
];
export const CLOSED: PmuStatus[] = ["accepted", "declined", "not_relevant"];

export function stageIndex(status: PmuStatus) {
  const index = STAGES.findIndex((stage) => stage.status === status);
  return index === -1 ? null : index;
}

/**
 * Where a place moves after an activity. Only ever forward along the stages,
 * except a "no" or "not now", which close or park it.
 */
export function statusAfter(status: PmuStatus, kind: ActivityKind, outreachBefore: number): PmuStatus {
  const forward = (to: PmuStatus) => {
    const now = stageIndex(status);
    const next = stageIndex(to);
    return now !== null && next !== null && next > now ? to : status;
  };
  if (kind === "declined") return "declined";
  if (kind === "not_now") return "not_now";
  if (OUTREACH.includes(kind)) {
    if (status === "not_now") return outreachBefore > 0 ? "followed_up" : "contacted";
    return forward(outreachBefore > 0 ? "followed_up" : "contacted");
  }
  if (kind === "replied") return forward("replied");
  if (kind === "call_booked") return forward("interview");
  if (kind === "visit") return forward("trial");
  if (kind === "offer") return forward("offer");
  return status;
}

const DAY = 86_400_000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (day: string, days: number) => isoDay(new Date(new Date(`${day}T12:00:00Z`).getTime() + days * DAY));
/** Working days: Saturday and Sunday don't count. */
export function addWorkingDays(day: string, days: number) {
  let date = new Date(`${day}T12:00:00Z`);
  let left = days;
  while (left > 0) {
    date = new Date(date.getTime() + DAY);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) left--;
  }
  return isoDay(date);
}

export type NextStep = {
  action: string;
  due: string;
  /** Which follow-up message fits, if one does. */
  message: "first" | "follow_up_1" | "follow_up_2" | "last" | null;
  custom: boolean;
};

/**
 * The next thing to do for a place, and by when. Your own next step wins;
 * otherwise it follows the cadence: a follow-up 2 days after the first
 * message, another at 7 days, a last one at 14, then park it as "Not now".
 */
export function nextStep(target: PmuTarget, activities: PmuActivity[], today: string): NextStep | null {
  if (target.next_action && target.next_action_on) {
    return { action: target.next_action, due: target.next_action_on, message: null, custom: true };
  }
  if (CLOSED.includes(target.status)) return null;
  const mine = activities
    .filter((activity) => activity.target_id === target.id)
    .sort((a, b) => a.at.localeCompare(b.at));
  const day = (iso: string) => iso.slice(0, 10);
  const last = (kinds: ActivityKind[]) => [...mine].reverse().find((activity) => kinds.includes(activity.kind));
  const outreach = mine.filter((activity) => OUTREACH.includes(activity.kind));
  const firstSent = outreach[0] ? day(outreach[0].at) : target.last_contacted_on;

  switch (target.status) {
    case "to_contact":
      return { action: "Send the first message", due: today, message: "first", custom: false };
    case "contacted":
    case "followed_up": {
      if (!firstSent) return { action: "Send the first message", due: today, message: "first", custom: false };
      const count = Math.max(outreach.length, 1);
      if (count === 1)
        return { action: "Follow up on WhatsApp", due: addDays(firstSent, 2), message: "follow_up_1", custom: false };
      if (count === 2)
        return {
          action: "Second follow-up, with one new detail",
          due: addDays(firstSent, 7),
          message: "follow_up_2",
          custom: false,
        };
      if (count === 3)
        return {
          action: "Last message, then let it rest",
          due: addDays(firstSent, 14),
          message: "last",
          custom: false,
        };
      return { action: "No answer: park as Not now", due: addDays(firstSent, 21), message: null, custom: false };
    }
    case "replied": {
      const replied = last(["replied"]);
      return {
        action: "Answer and book a call",
        due: addWorkingDays(replied ? day(replied.at) : today, 2),
        message: null,
        custom: false,
      };
    }
    case "interview": {
      const booked = last(["call_booked"]);
      return {
        action: "Have the call, then ask for a visit or trial day",
        due: addDays(booked ? day(booked.at) : today, 3),
        message: null,
        custom: false,
      };
    }
    case "trial": {
      const visit = last(["visit"]);
      return {
        action: "Ask for an offer",
        due: addDays(visit ? day(visit.at) : today, 3),
        message: null,
        custom: false,
      };
    }
    case "offer": {
      const offer = last(["offer"]);
      return {
        action: "Compare the offer and answer",
        due: addDays(offer ? day(offer.at) : today, 3),
        message: null,
        custom: false,
      };
    }
    case "not_now": {
      const parked = last(["not_now", ...OUTREACH]);
      return {
        action: "Check in again",
        due: addDays(parked ? day(parked.at) : today, 90),
        message: "follow_up_2",
        custom: false,
      };
    }
    default:
      return null;
  }
}

const monthDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

/** The follow-up to send, written for this place. */
export function followUpMessage(
  target: PmuTarget,
  step: "follow_up_1" | "follow_up_2" | "last",
  firstSent: string | null,
  portfolio = PMU_PORTFOLIO.instagram
) {
  const when = firstSent ? ` on ${monthDay(firstSent)}` : "";
  const medical = "brow restoration after hair loss, areola pigmentation and scar camouflage";
  if (step === "follow_up_1") {
    return `Hello ${target.name} team, this is Olga Goryszewska. I wrote to you${when} about working with you as a PMU and medical micropigmentation artist, freelance or in a permanent role (14 years of experience, including medical work: ${medical}). My healed results are here: ${portfolio}. Would you be open to a short call this week or next? Olga, +47 483 38 779`;
  }
  if (step === "follow_up_2") {
    return `Hello again, Olga Goryszewska here. One more thought: besides natural brows, lips and eyeliner, I can set up the whole PMU service for you, from treatment protocols and touch-up schedules to pricing and before-and-after content, as I did in my own studio for 13 years. Could we schedule a short call? I'd be glad to show you healed results, at a time that suits you.`;
  }
  return `Hello, Olga Goryszewska here. I don't want to fill your inbox, so this is my last message for now. If a PMU or medical micropigmentation artist could help ${target.name} later, freelance or permanent, I'd love to hear from you: olga.goryszewska@gmail.com or +47 483 38 779 (WhatsApp). Thank you, and all the best.`;
}

export type Overview = {
  byStage: { label: string; count: number }[];
  /** Places that answered, out of places contacted, per first channel. */
  byChannel: { channel: string; contacted: number; replied: number }[];
  byCountry: { country: string; contacted: number; replied: number }[];
  dueToday: number;
  overdue: number;
};

const CHANNELS: Partial<Record<ActivityKind, string>> = {
  email_sent: "Email",
  whatsapp_sent: "WhatsApp",
  form_sent: "Form",
  instagram_sent: "Instagram",
  called: "Phone",
};

const REPLIED: PmuStatus[] = ["replied", "interview", "trial", "offer", "accepted"];

/** The numbers at the top: stages, which channel gets answers, and where. */
export function overview(targets: PmuTarget[], activities: PmuActivity[], today: string): Overview {
  const byStage = [
    ...STAGES,
    { status: "not_now" as PmuStatus, label: "Not now" },
    { status: "declined" as PmuStatus, label: "Declined" },
  ].map((stage) => ({ label: stage.label, count: targets.filter((target) => target.status === stage.status).length }));
  const contacted = targets.filter((target) => target.status !== "to_contact" && target.status !== "not_relevant");
  const answered = (target: PmuTarget) =>
    REPLIED.includes(target.status) ||
    target.status === "declined" ||
    activities.some((activity) => activity.target_id === target.id && activity.kind === "replied");
  const firstChannel = (target: PmuTarget) => {
    const first = activities
      .filter((activity) => activity.target_id === target.id && CHANNELS[activity.kind])
      .sort((a, b) => a.at.localeCompare(b.at))[0];
    return first ? CHANNELS[first.kind]! : "Not logged";
  };
  const tally = (key: (target: PmuTarget) => string) => {
    const rows = new Map<string, { contacted: number; replied: number }>();
    for (const target of contacted) {
      const row = rows.get(key(target)) ?? { contacted: 0, replied: 0 };
      row.contacted++;
      if (answered(target)) row.replied++;
      rows.set(key(target), row);
    }
    return [...rows.entries()].sort((a, b) => b[1].contacted - a[1].contacted);
  };
  let dueToday = 0;
  let overdue = 0;
  for (const target of targets) {
    const step = nextStep(target, activities, today);
    if (!step || target.status === "to_contact") continue;
    if (step.due === today) dueToday++;
    else if (step.due < today) overdue++;
  }
  return {
    byStage,
    byChannel: tally(firstChannel).map(([channel, row]) => ({ channel, ...row })),
    byCountry: tally((target) => target.country).map(([country, row]) => ({ country, ...row })),
    dueToday,
    overdue,
  };
}
