// Run: npm test   (node's built-in runner with TypeScript stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addBusinessDays,
  classifyResearchError,
  computeGate,
  isStaleProcessing,
  osloToday,
  parseLegacyNotes,
  startOfWeek,
} from "./gtm-logic.ts";

test("addBusinessDays skips weekends", () => {
  assert.equal(addBusinessDays("2026-10-19", 4), "2026-10-23"); // Mon -> Fri
  assert.equal(addBusinessDays("2026-10-22", 4), "2026-10-28"); // Thu -> next Wed
  assert.equal(addBusinessDays("2026-10-24", 1), "2026-10-26"); // Sat -> Mon
  assert.equal(addBusinessDays("2026-10-19", 0), "2026-10-19");
});

test("startOfWeek returns Monday", () => {
  assert.equal(startOfWeek("2026-10-19"), "2026-10-19");
  assert.equal(startOfWeek("2026-10-25"), "2026-10-19"); // Sunday
  assert.equal(startOfWeek("2026-10-26"), "2026-10-26");
});

test("osloToday uses Oslo, not UTC", () => {
  // 23:30 UTC on 19 Oct is already 20 Oct in Oslo (CEST, UTC+2).
  assert.equal(osloToday(new Date("2026-10-19T23:30:00Z")), "2026-10-20");
});

test("parseLegacyNotes reads the old seed format", () => {
  const notes = `Segment F · Org.nr 962 956 491 · Vindafjord · 70 employees · Fit 5/5
Opener fact: Started as a local fuel supplier in 1961.
Contact: via the Bryne office.
Source: https://www.finn.no/451932973`;
  assert.deepEqual(parseLegacyNotes(notes), {
    openerFact: "Started as a local fuel supplier in 1961.",
    openerSource: "https://www.finn.no/451932973",
    segment: "F",
    orgNumber: "962956491",
    location: "Vindafjord",
    employees: 70,
  });
  assert.deepEqual(parseLegacyNotes("Just a note"), {});
  assert.deepEqual(parseLegacyNotes(null), {});
});

test("classifyResearchError separates account problems from one-off failures", () => {
  assert.equal(classifyResearchError("400 Your credit balance is too low to access the Anthropic API."), "blocked");
  assert.equal(classifyResearchError("Monthly research budget reached ($9.50 of $10)."), "blocked");
  assert.equal(classifyResearchError("Claude declined to research this company."), "permanent");
  assert.equal(classifyResearchError("Research was cut off (max_tokens)."), "retryable");
  assert.equal(classifyResearchError("fetch failed"), "retryable");
});

test("isStaleProcessing detects interrupted runs", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  assert.equal(isStaleProcessing("2026-10-19T11:55:00Z", now), false);
  assert.equal(isStaleProcessing("2026-10-19T11:45:00Z", now), true);
  assert.equal(isStaleProcessing(null, now), true);
});

test("computeGate only counts completed interviews and the hours threshold", () => {
  const call = (leadId: string, hours: number | null, problems: string[], status = "completed", pilot = "unknown") => ({
    leadId,
    status,
    hoursPerWeek: hours,
    problemCategories: problems,
    pilotInterest: pilot,
  });
  const calls = [
    call("a", 8, ["manual_entry"], "completed", "yes"),
    call("b", 6, ["manual_entry", "invoice_delay"]),
    call("c", 3, ["manual_entry"]),
    call("d", 10, ["invoice_delay"], "booked"), // not completed — ignored
    call("e", null, ["manual_entry"]),
  ];
  const gate = computeGate(calls);
  assert.equal(gate.interviewed, 4);
  assert.equal(gate.meetsHoursCount, 2);
  assert.equal(gate.pilotInterested, 1);
  assert.deepEqual(gate.problems[0], { problem: "manual_entry", reported: 4, meetsHours: 2 });
  assert.equal(gate.verdict, "not_enough_interviews");

  const many = Array.from({ length: 15 }, (_, i) => call(`c${i}`, i < 5 ? 6 : 1, ["manual_entry"]));
  assert.equal(computeGate(many).verdict, "met");
  const fewHours = Array.from({ length: 15 }, (_, i) => call(`c${i}`, i < 4 ? 6 : 1, ["manual_entry"]));
  assert.equal(computeGate(fewHours).verdict, "not_met");
});
