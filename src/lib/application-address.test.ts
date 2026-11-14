import assert from "node:assert/strict";
import { test } from "node:test";
import { addressProblem, isForeignBranch, osloStartOfDay } from "./application-address.ts";

const company = (name: string, website: string | null = null) => ({ name, website });

test("a general address on the company's website domain is fine", () => {
  assert.equal(addressProblem("post@scienta.no", company("SCIENTA AS", "https://www.scienta.no")), null);
  assert.equal(addressProblem("hei@netlife.com", company("NETLIFE DESIGN AS", "netlife.com")), null);
  assert.equal(addressProblem("firmapost.no@aditro.com", company("ADITRO AS")), null);
});

test("without a website the domain must carry the company's name", () => {
  assert.equal(addressProblem("post@agens.no", company("AGENS AS")), null);
  assert.match(addressProblem("support@readymag.com", company("ANORAK AS")) ?? "", /customer or business inbox/);
  assert.match(addressProblem("post@readymag.com", company("ANORAK AS")) ?? "", /own domain/);
});

test("another country's parent site doesn't count when the website says otherwise", () => {
  assert.match(addressProblem("kontakt@eg.dk", company("EG RETAIL AS", "https://www.eg.no")) ?? "", /own domain/);
});

test("customer, sales and billing inboxes are refused", () => {
  for (const email of [
    "sales@netlight.com",
    "kundeservice@pointtaken.no",
    "kunde@cloudconnection.no",
    "hello.marketing@dentsu.com",
    "flyt.compliance@visma.com",
    "support@webmed.no",
  ]) {
    assert.ok(addressProblem(email, company("X", `https://${email.split("@")[1]}`)), email);
  }
});

test("scraped junk is not an address", () => {
  const junk =
    "s%20a%20fall%20getaway%20on%20tiktok%20for%20everyone.we%e2%80%99re%20excited%20to%20spotlight%20creators.%20@baker.reads";
  assert.match(addressProblem(junk, company("TIKTOK NORWAY AS")) ?? "", /not a valid/);
  assert.match(addressProblem("post@acme", company("Acme")) ?? "", /not a valid/);
});

test("co.uk-style domains compare on the right label", () => {
  assert.equal(addressProblem("hello@acme.co.uk", company("Acme Ltd", "https://www.acme.co.uk")), null);
});

test("the Oslo day starts at local midnight, winter and summer", () => {
  assert.equal(osloStartOfDay(new Date("2026-11-04T10:00:00Z")).toISOString(), "2026-11-03T23:00:00.000Z");
  assert.equal(osloStartOfDay(new Date("2026-07-01T10:00:00Z")).toISOString(), "2026-06-30T22:00:00.000Z");
  assert.equal(osloStartOfDay(new Date("2026-11-03T23:30:00Z")).toISOString(), "2026-11-03T23:00:00.000Z");
  assert.equal(osloStartOfDay(new Date("2026-11-03T22:30:00Z")).toISOString(), "2026-11-02T23:00:00.000Z");
});

test("a foreign company's Norwegian branch is skipped, a Norwegian company isn't", () => {
  assert.ok(isForeignBranch({ name: "TIKTOK NORWAY AS", website: "https://www.tiktok.com" }));
  assert.ok(isForeignBranch({ name: "ACME NORGE AS", website: null }));
  assert.ok(!isForeignBranch({ name: "BAUER MEDIA OUTDOOR NORGE AS", website: "clearchannel.no" }));
  assert.ok(!isForeignBranch({ name: "KNOWIT AS", website: "knowit.no" }));
});
