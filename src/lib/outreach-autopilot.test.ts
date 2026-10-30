import { test } from "node:test";
import assert from "node:assert/strict";
import { nextAutoStep, passesAutopilotBar } from "./outreach-autopilot.ts";

const lead = {
  status: "new",
  responded: false,
  do_not_contact: false,
  country: "NO",
  email: "post@firma.no",
  first_contacted_on: null,
  next_follow_up_on: null,
};
const today = "2026-10-28";

test("a new Norwegian lead with a company address gets the first message", () => {
  assert.deepEqual(nextAutoStep(lead, [], true, today), { kind: "first_message" });
});

test("never emails personal addresses, Polish leads, replies or do-not-contact", () => {
  assert.ok("skip" in nextAutoStep(lead, [], false, today));
  assert.ok("skip" in nextAutoStep({ ...lead, country: "PL" }, [], true, today));
  assert.ok("skip" in nextAutoStep({ ...lead, responded: true }, [], true, today));
  assert.ok("skip" in nextAutoStep({ ...lead, do_not_contact: true }, [], true, today));
  assert.ok("skip" in nextAutoStep({ ...lead, email: null }, [], true, today));
  assert.ok("skip" in nextAutoStep({ ...lead, status: "not_interested" }, [], true, today));
});

test("follow-ups go out when due, in order, and only after an email first contact", () => {
  const contacted = { ...lead, status: "contacted", first_contacted_on: "2026-10-22", next_follow_up_on: "2026-10-28" };
  const first = { kind: "first_message", channel: "email" };
  assert.deepEqual(nextAutoStep(contacted, [first], true, today), { kind: "follow_up" });
  assert.deepEqual(nextAutoStep(contacted, [first, { kind: "follow_up", channel: "email" }], true, today), {
    kind: "final_follow_up",
  });
  assert.ok("skip" in nextAutoStep({ ...contacted, next_follow_up_on: "2026-10-30" }, [first], true, today));
  assert.ok("skip" in nextAutoStep({ ...contacted, next_follow_up_on: null }, [first], true, today));
  assert.ok("skip" in nextAutoStep(contacted, [{ kind: "connection_note", channel: "linkedin" }], true, today));
});

test("only messages with no notes at all may go out unseen", () => {
  assert.ok(passesAutopilotBar([]));
  assert.ok(!passesAutopilotBar([{ level: "info" }]));
  assert.ok(!passesAutopilotBar([{ level: "warning" }]));
});
