import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMessage, isReady } from "./message-quality.ts";
import { INDUSTRY_VALUES, PLAYBOOKS, industryFromCode } from "./industry-playbooks.ts";

const ids = (issues: { id: string }[]) => issues.map((issue) => issue.id);

const good = `Hei Eivind,

Jeg så at Aune Maskin kjører vinterbrøyting og massetransport på strekningen Trondheim–Røros.

Hvordan kommer timer og dokumentasjon fra sjåførene inn til kontoret hos dere i dag?

I Enodre hjelper vi bedrifter med å forenkle arbeidsflyten mellom felt og kontor, slik at mindre tid går til dobbeltarbeid.

Olga, Enodre`;

test("a good, personalised message passes", () => {
  const issues = checkMessage({
    kind: "first_message",
    language: "no",
    body: good,
    companyName: "Aune Maskin AS",
    verifiedFacts: ["Winter road clearing and mass transport on the Trondheim–Røros–Oppdal axis"],
  });
  assert.deepEqual(ids(issues), []);
  assert.ok(isReady(issues));
});

test("placeholder blocks approval; unverified numbers and assumed problems warn", () => {
  const issues = checkMessage({
    kind: "first_message",
    language: "no",
    body: "Hei,\n\n[Én konkret, sann ting om dem]\n\nDere har et problem med fakturering siden 1987. I Enodre vi automatiserer dette. Vi tilbyr en revolusjonerende løsning, gratis!",
    companyName: "Knapphus Energi AS",
    verifiedFacts: ["Started as a local fuel supplier in 1961"],
  });
  const found = ids(issues);
  assert.ok(found.includes("placeholder"));
  assert.ok(!isReady(issues));
  assert.ok(found.includes("unverified-1987"));
  assert.ok(found.includes("assumed-problem"));
  assert.ok(found.includes("word-order"));
  assert.ok(found.includes("salesy"));
  assert.ok(found.includes("no-question"));
});

test("generic opening: info without facts, warning when facts exist", () => {
  const body =
    "Hei,\n\nHvordan håndterer dere servicerapporter i dag?\n\nI Enodre hjelper vi bedrifter med å forenkle arbeidsflyten.";
  const none = checkMessage({
    kind: "first_message",
    language: "no",
    body,
    companyName: "Vestfold Trafo Energi AS",
    verifiedFacts: [],
  });
  assert.equal(none.find((i) => i.id === "generic")?.level, "info");
  const some = checkMessage({
    kind: "first_message",
    language: "no",
    body,
    companyName: "Vestfold Trafo Energi AS",
    verifiedFacts: ["Has worked on transformers since 1947"],
  });
  assert.equal(some.find((i) => i.id === "generic")?.level, "warning");
});

test("connection notes over 300 characters are blocked; meeting asks are flagged", () => {
  const long = checkMessage({
    kind: "connection_note",
    language: "no",
    body: "a ".repeat(160),
    companyName: null,
    verifiedFacts: [],
  });
  assert.ok(!isReady(long));
  const meeting = checkMessage({
    kind: "first_message",
    language: "no",
    body: good + "\n\nHar du 15 minutter til et møte?",
    companyName: "Aune Maskin AS",
    verifiedFacts: [],
  });
  assert.ok(ids(meeting).includes("meeting-ask"));
});

test("every industry has a complete playbook; codes map to playbooks", () => {
  for (const industry of INDUSTRY_VALUES) {
    const playbook = PLAYBOOKS[industry];
    assert.ok(playbook.workflow.length >= 2, industry);
    assert.ok(playbook.openingQuestions.length >= 1, industry);
    assert.ok(playbook.discoveryQuestions.length >= 2, industry);
    for (const q of playbook.openingQuestions) assert.ok(q.no.endsWith("?") && q.en.endsWith("?"), industry);
  }
  assert.equal(industryFromCode("43.120"), "contractor");
  assert.equal(industryFromCode("43.210"), "electrical_plumbing");
  assert.equal(industryFromCode("77.320"), "equipment_rental");
  assert.equal(industryFromCode("49.410"), "logistics");
  assert.equal(industryFromCode("46.810"), "fuel_energy");
  assert.equal(industryFromCode("33.140"), "technical_service");
  assert.equal(industryFromCode("81.210"), "cleaning_facility");
  assert.equal(industryFromCode(null), "other");
});

test("the final follow-up doesn't need a question", () => {
  const issues = checkMessage({
    kind: "final_follow_up",
    language: "no",
    body: "Hei,\n\nJeg skal ikke fylle innboksen din, så dette er siste melding fra meg. Et kort «nei takk» er helt i orden.\n\nOlga, Enodre",
    companyName: "Aune Maskin AS",
    verifiedFacts: [],
  });
  assert.ok(!issues.some((i) => i.id === "no-question"));
});

test("a 5-minute talk is a fine first ask; meetings and demos are flagged", () => {
  const ask = (closing: string) =>
    checkMessage({
      kind: "first_message",
      language: "no",
      body: `${good}\n\n${closing}`,
      companyName: "Aune Maskin AS",
      verifiedFacts: [],
    }).some((i) => i.id === "meeting-ask");
  assert.equal(ask("Er du åpen for en kort prat på 5 minutter?"), false);
  assert.equal(ask("Kan vi booke en demo neste uke?"), true);
  assert.equal(ask("Har du tid til et møte på 30 minutter?"), true);
});
