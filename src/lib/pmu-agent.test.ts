import assert from "node:assert/strict";
import { test } from "node:test";
import {
  byPay,
  instagramLink,
  mailtoLink,
  pmuEmail,
  pmuShortMessage,
  whatsappLink,
  type PmuTarget,
} from "./pmu-agent.ts";

const target = (extra: Partial<PmuTarget> = {}): PmuTarget => ({
  id: "1",
  kind: "clinic",
  name: "Novomed",
  city: "Marbella",
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
  status: "to_contact",
  last_contacted_on: null,
  ...extra,
});

test("messages never misstate a title", () => {
  for (const kind of ["clinic", "salon", "studio", "academy", "agency"] as const) {
    const text = `${pmuShortMessage(target({ kind }), {})} ${pmuEmail(target({ kind }), {}).body}`;
    assert.doesNotMatch(text, /licensed|cosmetologist|aesthetician|beauty expert/i, kind);
  }
});

test("clinic messages mention the medical work and offer freelance", () => {
  const text = pmuShortMessage(target(), {});
  assert.match(text, /brow restoration after hair loss, areola pigmentation/);
  assert.match(text, /freelance on set days or a permanent role/);
  assert.doesNotMatch(text, /full-time|relocate|you offer medical|renting|room/);
  assert.match(text, /short call/);
  assert.match(pmuEmail(target(), {}).body, /short call/);
});

test("contact links", () => {
  assert.equal(whatsappLink("+34 635 36 46 77", "Hi there"), "https://wa.me/34635364677?text=Hi%20there");
  assert.equal(whatsappLink(null, "x"), null);
  assert.equal(instagramLink("@herplace.dxb"), "https://www.instagram.com/herplace.dxb");
  assert.equal(instagramLink("https://instagram.com/celebrity.qa/"), "https://www.instagram.com/celebrity.qa");
  assert.match(
    mailtoLink("office@celebrity.qa", "Hi", "A & B") ?? "",
    /^mailto:office@celebrity\.qa\?subject=Hi&body=A%20%26%20B$/
  );
});

test("best pay first, then fit", () => {
  const list = byPay([
    target({ name: "B", pay_score: 3, fit: "high" }),
    target({ name: "A", pay_score: 5, fit: "medium" }),
    target({ name: "C", pay_score: 3, fit: "medium" }),
  ]);
  assert.deepEqual(
    list.map((item) => item.name),
    ["A", "B", "C"]
  );
});

test("Costa Blanca messages offer Norwegian and English", () => {
  const albir = target({ country: "Spain", city: "Albir", name: "Derma Clinic Spain" });
  assert.match(pmuShortMessage(albir, {}), /English, Norwegian and Polish/);
  assert.doesNotMatch(pmuShortMessage(target({ country: "Norway", city: "Bergen" }), {}), /Norwegian and Polish/);
});

test("Spanish and Portuguese messages offer Norwegian and English, and never mention a Gulf licence", () => {
  for (const country of ["Spain", "Portugal"]) {
    const text = `${pmuShortMessage(target({ country }), {})} ${pmuEmail(target({ country }), {}).body}`;
    assert.match(text, /English, Norwegian and Polish/);
    assert.doesNotMatch(text, /DHA|Dubai|visa/i);
  }
});

test("greetings: the clinic's name, or the doctor herself", () => {
  assert.match(
    pmuShortMessage(target({ name: "Dra. Rosana Villalba – Medicina Estética" }), {}),
    /^Hello Dra\. Rosana Villalba,/
  );
  assert.match(
    pmuShortMessage(target({ name: "Zen Smile Spa – Dr. Carolyn Carbasse" }), {}),
    /^Hello Zen Smile Spa team,/
  );
  assert.match(pmuShortMessage(target({ name: "Clínica Miramar" }), {}), /^Hello Clínica Miramar team,/);
});
