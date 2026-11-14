import assert from "node:assert/strict";
import { test } from "node:test";
import {
  answerFor,
  applicantFromProfile,
  bookmarkletFor,
  fillPlan,
  formSite,
  isNextButton,
  isStartButton,
  isSubmitButton,
  type Applicant,
} from "./form-fill.ts";

const me: Applicant = {
  firstName: "Olga",
  lastName: "Goryszewska",
  email: "olga.goryszewska@gmail.com",
  phone: "+47 483 38 779",
  city: "Bergen",
  country: "Norway",
  linkedin: "https://www.linkedin.com/in/olga-goryszewska",
  github: "https://github.com/OlgaGoryszewska",
  portfolio: "https://enodre.com",
  currentTitle: "Full Stack Developer & Product Engineer",
  yearsExperience: "3",
  languages: "Polish, English, Norwegian",
  education: "Frontend Development and UX Design, Noroff",
  answers: { notice_period: "1 December 2026", salary_norway: "NOK 650 000", salary_abroad: "EUR 55 000" },
};

test("fields get the right answer in English, Norwegian, Polish and Spanish", () => {
  assert.deepEqual(answerFor("First name *", me), { text: "Olga" });
  assert.deepEqual(answerFor("Etternavn", me), { text: "Goryszewska" });
  assert.deepEqual(answerFor("Full name", me), { text: "Olga Goryszewska" });
  assert.deepEqual(answerFor("E-post", me), { text: "olga.goryszewska@gmail.com" });
  assert.deepEqual(answerFor("Mobilnummer", me), { text: "+47 483 38 779" });
  assert.deepEqual(answerFor("LinkedIn profile URL", me), { text: "https://www.linkedin.com/in/olga-goryszewska" });
  assert.deepEqual(answerFor("Portfolio or website", me), { text: "https://enodre.com" });
  assert.deepEqual(answerFor("Nazwisko", me), { text: "Goryszewska" });
  assert.deepEqual(answerFor("Resume/CV", me), { file: "cv" });
  assert.deepEqual(answerFor("Last opp CV", me), { file: "cv" });
  assert.deepEqual(answerFor("Cover letter", me), { coverLetter: true });
  assert.deepEqual(answerFor("Søknadstekst", me), { coverLetter: true });
});

test("salary depends on the country; missing answers are left for you", () => {
  assert.deepEqual(answerFor("Lønnsforventning", me, "Norway"), { text: "NOK 650 000" });
  assert.deepEqual(answerFor("Salary expectations", me, "Poland"), { text: "EUR 55 000" });
  assert.equal(answerFor("Are you willing to relocate?", me), null);
});

test("sensitive and legal fields are never filled", () => {
  for (const label of [
    "Password",
    "Fødselsnummer",
    "Gender",
    "I agree to the privacy policy",
    "Date of birth",
    "IBAN",
  ]) {
    assert.equal(answerFor(label, me), null, label);
  }
});

test("the filler opens forms and goes to the next step, but never presses Submit", () => {
  assert.ok(isStartButton("Easy Apply"));
  assert.ok(isStartButton("Søk her"));
  assert.ok(isStartButton("Apply for this job"));
  assert.ok(isNextButton("Next"));
  assert.ok(isNextButton("Review"));
  for (const label of ["Submit application", "Send søknad", "Send", "Wyślij", "Bekreft og send"]) {
    assert.ok(isSubmitButton(label), label);
    assert.ok(!isStartButton(label) && !isNextButton(label), label);
  }
});

test("form sites", () => {
  assert.equal(formSite("https://www.linkedin.com/jobs/view/1/"), "LinkedIn");
  assert.equal(formSite("https://acme.teamtailor.com/jobs/1"), "Teamtailor");
  assert.equal(formSite("https://jobs.acme.no/apply"), "jobs.acme.no");
});

test("the bookmark carries your details and never clicks anything", () => {
  const plan = fillPlan(applicantFromProfile({ notice_period: "1 December 2026" }));
  const rule = (label: string) => plan.rules.find(([source]) => new RegExp(source, "i").test(label));
  assert.deepEqual(rule("First name")?.slice(1), ["text", "Olga"]);
  assert.deepEqual(rule("Notice period")?.slice(1), ["text", "1 December 2026"]);
  assert.deepEqual(rule("Resume")?.slice(1), ["cv", ""]);
  const code = decodeURIComponent(bookmarkletFor(plan).replace(/^javascript:/, ""));
  assert.doesNotMatch(code, /\.click\(|\.submit\(|requestSubmit/);
  // It's valid JavaScript.
  assert.doesNotThrow(() => new Function(code));
});

test("your details come from the CV block", () => {
  const me = applicantFromProfile({});
  assert.equal(me.firstName, "Olga");
  assert.equal(me.city, "Bergen");
  assert.equal(me.country, "Norway");
});
