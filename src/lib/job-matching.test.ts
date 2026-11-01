import { test } from "node:test";
import assert from "node:assert/strict";
import { adLanguage, applicationEmail, cityOf, coverLetter, notEnglishFriendly, scoreJob } from "./job-matching.ts";

test("scores a matching ad high and an unrelated one out", () => {
  const good = scoreJob({
    title: "Frontend Developer (React / Next.js)",
    text: "We build with React, Next.js, TypeScript and Supabase. Figma for design.",
  });
  assert.ok(good.score >= 60, String(good.score));
  assert.ok(good.matched.includes("Next.js") && good.matched.includes("Supabase"));
  assert.equal(scoreJob({ title: "PLC Software Engineer", text: "Siemens S7" }).rejected, "Different specialism");
  assert.equal(scoreJob({ title: "Sykepleier", text: "" }).rejected, "Not a developer/UX role");
  assert.equal(scoreJob({ title: "Principal React Engineer", text: "React" }).rejected, "Senior or lead role");
  assert.equal(scoreJob({ title: "Senior Frontend Developer", text: "React" }).rejected, "Senior or lead role");
  assert.equal(
    scoreJob({ title: "Frontend Developer", text: "You have 5+ years of experience with React." }).rejected,
    "Asks for 5+ years"
  );
  assert.equal(
    scoreJob({ title: "Frontend Developer", text: "You have 2+ years of experience with React." }).rejected,
    null
  );
});

test("places locations in the target cities", () => {
  assert.equal(cityOf("OSLO"), "Oslo");
  assert.equal(cityOf("Warszawa, mazowieckie"), "Warsaw");
  assert.equal(cityOf("Dubai, United Arab Emirates"), "Dubai");
  assert.equal(cityOf("Riyadh"), "Riyadh");
  assert.equal(cityOf("Colombo, Western Province"), "Colombo");
  assert.equal(cityOf("Remote (EMEA)"), "Remote");
  assert.equal(cityOf("Bergen"), null);
});

test("finds an application email only when the ad asks for one", () => {
  assert.equal(applicationEmail("Send søknad og CV til jobb@firma.no innen 1. november."), "jobb@firma.no");
  assert.equal(applicationEmail("Please apply by sending your CV to careers@acme.ae"), "careers@acme.ae");
  assert.equal(applicationEmail("Spørsmål om stillingen? Kontakt kari@firma.no"), null);
});

test("cover letter follows the ad's language and names the role", () => {
  assert.equal(adLanguage("Vi søker en utvikler som har erfaring med React og som liker å jobbe i team"), "no");
  const letter = coverLetter({
    title: "Frontend-utvikler",
    company: "Firma AS",
    matched: ["React", "Next.js"],
    language: "no",
  });
  assert.ok(letter.includes("Frontend-utvikler hos Firma AS"));
  assert.ok(letter.includes("React og Next.js"));
});

test("Spain counts as one target location", () => {
  assert.equal(cityOf("Madrid, Comunidad de Madrid"), "Spain");
  assert.equal(cityOf("Barcelona"), "Spain");
  assert.equal(cityOf("España"), "Spain");
});

test("Spain: English-speaking international roles only", () => {
  assert.equal(
    notEnglishFriendly(
      "We are an international team in Barcelona. English is our working language. Spanish is a plus."
    ),
    null
  );
  assert.equal(
    notEnglishFriendly("We are looking for a React developer. Fluent Spanish is required for client meetings."),
    "Spanish required"
  );
  assert.equal(
    notEnglishFriendly("Buscamos un desarrollador React con experiencia para nuestra empresa en Madrid."),
    "Ad written in Spanish"
  );
});

test("HealthTech/BeautyTech roles count only at a health or beauty company", () => {
  const clinic = scoreJob({ title: "Implementation Specialist", text: "Pabau – software for aesthetic clinics" });
  assert.equal(clinic.rejected, null);
  assert.ok(clinic.score >= 45, String(clinic.score));
  assert.equal(scoreJob({ title: "Customer Success Manager", text: "Doctolib, patient booking" }).rejected, null);
  assert.equal(scoreJob({ title: "Associate Product Manager", text: "Digital health platform" }).rejected, null);
  assert.equal(
    scoreJob({ title: "Customer Success Manager", text: "Logistics software for hauliers" }).rejected,
    "Not a health or beauty company"
  );
  assert.equal(scoreJob({ title: "Senior Product Manager", text: "Healthtech" }).rejected, "Senior or lead role");
  const letter = coverLetter({ title: "Implementation Specialist", company: "Pabau", matched: [], language: "en" });
  assert.ok(letter.includes("13 years") && letter.includes("at Pabau"));
  assert.ok(!letter.includes("Public Health"));
});

test("staff perks don't make a company a health company", () => {
  const perk = scoreJob({
    title: "Customer Success Manager",
    text: "Logistics SaaS. We offer private health insurance.",
  });
  assert.equal(perk.rejected, "Not a health or beauty company");
});
