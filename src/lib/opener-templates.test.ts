import { test } from "node:test";
import assert from "node:assert/strict";
import {
  displayCompanyName,
  factLanguage,
  factOpening,
  profileOpening,
  roleFromAdTitle,
  roleOpening,
  titleCase,
} from "./opener-templates.ts";
import { checkMessage } from "./message-quality.ts";

test("guesses the language of a fact", () => {
  assert.equal(factLanguage("Kjører vinterbrøyting og massetransport på strekningen Trondheim–Røros"), "no");
  assert.equal(factLanguage("Opened a new office in Bodø and is hiring two project managers"), "en");
});

test("tidies register names and places", () => {
  assert.equal(displayCompanyName("AUNE MASKIN AS"), "Aune Maskin");
  assert.equal(displayCompanyName("Xlent Oslo AS"), "Xlent Oslo");
  assert.equal(titleCase("NORD-FRON"), "Nord-Fron");
});

test("a fact opening is only written in the fact's own language", () => {
  const fact = {
    fact: "Kjører vinterbrøyting og massetransport på strekningen Trondheim–Røros",
    source_url: "https://www.aunemaskin.no/tjenester",
  };
  assert.equal(
    factOpening(fact, "no"),
    "Jeg leste om dere på aunemaskin.no: Kjører vinterbrøyting og massetransport på strekningen Trondheim–Røros."
  );
  assert.equal(factOpening(fact, "en"), null);
});

test("the register-based opening is specific enough for the quality check", () => {
  const activity = { no: "driver med bygg og anlegg", en: "work in construction" };
  const opening = profileOpening({ company: "AUNE MASKIN AS", location: "TRONDHEIM", activity }, "no");
  assert.equal(opening, "Jeg kom over Aune Maskin – jeg ser at dere driver med bygg og anlegg i Trondheim.");
  assert.equal(
    profileOpening({ company: "AUNE MASKIN AS", location: null, activity }, "en"),
    "I came across Aune Maskin – I see you work in construction."
  );
  const body = [
    "Hei Eivind,",
    opening,
    "Hvordan kommer timer og dokumentasjon fra prosjektene inn til kontoret hos dere i dag?",
    "I Enodre hjelper vi bedrifter med å forenkle arbeidsflyten mellom felt og kontor.",
    "Er du åpen for en kort prat på 5 minutter?",
    "Olga, Enodre",
  ].join("\n\n");
  const issues = checkMessage({
    kind: "first_message",
    language: "no",
    body,
    companyName: "AUNE MASKIN AS",
    verifiedFacts: [],
  });
  assert.ok(!issues.some((issue) => issue.id === "generic"), issues.map((i) => i.id).join(","));
});

test("pulls the role out of sentence-style job-ad titles", () => {
  assert.deepEqual(roleFromAdTitle("Vi er på jakt etter Senior Systemutviklere!"), {
    role: "senior systemutviklere",
    plural: true,
  });
  assert.deepEqual(
    roleFromAdTitle(
      "Bli med å videreutvikle idrettens mest populære plattform som Fullstack utvikler i Spond! Full-Stack Developer (Java/Go"
    ),
    { role: "fullstack utvikler", plural: false }
  );
  assert.deepEqual(roleFromAdTitle("Vil du bygge fremtidens plattform? Skytale søker fullstack-utvikler med .NET"), {
    role: "fullstack-utvikler",
    plural: false,
  });
  assert.equal(roleFromAdTitle("AI Talent Community"), null);
  assert.equal(
    roleOpening({ role: "senior systemutviklere", plural: true }, "no"),
    "Jeg så at dere søker senior systemutviklere."
  );
  assert.equal(
    roleOpening({ role: "fullstack utvikler", plural: false }, "en"),
    "I saw that you're looking for a fullstack utvikler."
  );
});
