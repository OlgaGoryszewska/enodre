import assert from "node:assert/strict";
import { test } from "node:test";
import type { PmuTarget } from "./pmu-agent.ts";
import { addWorkingDays, followUpMessage, nextStep, overview, statusAfter, type PmuActivity } from "./pmu-tracking.ts";

const target = (extra: Partial<PmuTarget> = {}): PmuTarget => ({
  id: "t1",
  kind: "clinic",
  name: "Clínica Miramar",
  city: "Benissa",
  country: "Spain",
  website: null,
  instagram: null,
  whatsapp: null,
  email: null,
  services: null,
  pay_score: 4,
  pay_note: null,
  fit: "high",
  source_url: null,
  notes: null,
  status: "contacted",
  last_contacted_on: null,
  ...extra,
});
const act = (kind: PmuActivity["kind"], at: string, targetId = "t1"): PmuActivity => ({
  id: `${kind}-${at}`,
  target_id: targetId,
  kind,
  at: `${at}T10:00:00Z`,
  note: null,
});

test("stages only move forward, except a no or a not now", () => {
  assert.equal(statusAfter("to_contact", "email_sent", 0), "contacted");
  assert.equal(statusAfter("contacted", "whatsapp_sent", 1), "followed_up");
  assert.equal(statusAfter("interview", "email_sent", 3), "interview");
  assert.equal(statusAfter("followed_up", "replied", 2), "replied");
  assert.equal(statusAfter("replied", "call_booked", 2), "interview");
  assert.equal(statusAfter("offer", "replied", 2), "offer");
  assert.equal(statusAfter("interview", "declined", 2), "declined");
  assert.equal(statusAfter("not_now", "email_sent", 3), "followed_up");
});

test("the follow-up cadence: 2, 7 and 14 days after the first message", () => {
  const sent = [act("email_sent", "2026-11-13")];
  assert.deepEqual(nextStep(target(), sent, "2026-11-14"), {
    action: "Follow up on WhatsApp",
    due: "2026-11-15",
    message: "follow_up_1",
    custom: false,
  });
  const twice = [...sent, act("whatsapp_sent", "2026-11-15")];
  assert.equal(nextStep(target({ status: "followed_up" }), twice, "2026-11-16")?.due, "2026-11-20");
  const thrice = [...twice, act("email_sent", "2026-11-20")];
  assert.equal(nextStep(target({ status: "followed_up" }), thrice, "2026-11-21")?.message, "last");
  const four = [...thrice, act("email_sent", "2026-11-27")];
  assert.match(nextStep(target({ status: "followed_up" }), four, "2026-11-28")?.action ?? "", /Not now/);
});

test("a reply means a call within 2 working days; your own step always wins", () => {
  const replied = [act("email_sent", "2026-11-13"), act("replied", "2026-11-13")];
  assert.equal(nextStep(target({ status: "replied" }), replied, "2026-11-13")?.due, "2026-11-17");
  const custom = target({ next_action: "Send prices", next_action_on: "2026-11-20" });
  assert.deepEqual(nextStep(custom, [], "2026-11-14"), {
    action: "Send prices",
    due: "2026-11-20",
    message: null,
    custom: true,
  });
  assert.equal(nextStep(target({ status: "accepted" }), [], "2026-11-14"), null);
});

test("working days skip the weekend", () => {
  assert.equal(addWorkingDays("2026-11-13", 1), "2026-11-16");
  assert.equal(addWorkingDays("2026-11-11", 2), "2026-11-13");
});

test("follow-ups name the date and the medical work", () => {
  assert.match(followUpMessage(target(), "follow_up_1", "2026-11-13"), /on 13 November/);
  assert.match(followUpMessage(target(), "follow_up_1", null), /areola/);
  assert.match(followUpMessage(target(), "last", null), /last message/);
});

test("overview: stages, channels that get answers, and what's due", () => {
  const targets = [
    target({ id: "a", status: "contacted" }),
    target({ id: "b", status: "replied", country: "Portugal" }),
    target({ id: "c", status: "to_contact" }),
  ];
  const activities = [
    act("email_sent", "2026-11-13", "a"),
    act("whatsapp_sent", "2026-11-10", "b"),
    act("replied", "2026-11-11", "b"),
  ];
  const result = overview(targets, activities, "2026-11-15");
  assert.equal(result.byStage.find((stage) => stage.label === "Replied")?.count, 1);
  assert.deepEqual(result.byChannel, [
    { channel: "Email", contacted: 1, replied: 0 },
    { channel: "WhatsApp", contacted: 1, replied: 1 },
  ]);
  assert.equal(result.dueToday, 1);
  assert.equal(result.overdue, 1);
});
