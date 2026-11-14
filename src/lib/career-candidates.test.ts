import assert from "node:assert/strict";
import { test } from "node:test";
import { careerCandidates, careerIndustry, isRecruiterName } from "./career-candidates.ts";

const ad = (company: string | null, title: string, score = 60, snippet = "") => ({
  company,
  title,
  city: "Oslo",
  snippet,
  score,
  url: "https://example.com",
});

test("recruiters are recognised by name", () => {
  assert.ok(isRecruiterName("Academic Work"));
  assert.ok(isRecruiterName("Nordic Tech Rekruttering AS"));
  assert.ok(!isRecruiterName("Dignio AS"));
});

test("health and beauty come from the ad, not its perks", () => {
  assert.equal(careerIndustry("Frontend developer at Dignio, remote patient monitoring"), "HealthTech");
  assert.equal(careerIndustry("React developer for a skincare brand"), "BeautyTech");
  assert.equal(careerIndustry("React developer. We offer private health insurance."), null);
});

test("companies hiring for your role and the recruiters posting ads become candidates", () => {
  const list = careerCandidates({
    ads: [
      ad("Dignio AS", "Frontend-utvikler", 40, "pasienter"),
      ad("Academic Work", "React Developer", 55),
      ad("Visma", "Senior .NET", 20),
      ad("Kantega", "Fullstack-utvikler", 72),
      ad("Kantega", "Frontend-utvikler", 60),
    ],
    agencies: [],
    existing: [],
    appliedTo: ["Kantega AS"],
  });
  assert.deepEqual(
    list.map((item) => [item.name, item.kind, item.industry, item.fit, item.appliedBefore]),
    [
      ["Kantega", "company", null, "high", true],
      ["Dignio AS", "company", "HealthTech", "high", false],
      ["Academic Work", "agency", null, "medium", false],
    ]
  );
  assert.match(list[0].reason, /Fullstack-utvikler.*Frontend-utvikler/);
});

test("anything already in the tracker is left out, whatever its legal form", () => {
  const list = careerCandidates({
    ads: [ad("Storm3 Ltd", "Recruiter for React roles", 80)],
    agencies: [{ name: "STORM3 AS", website: null, municipality: "OSLO", employees: 10 }],
    existing: ["Storm3"],
    appliedTo: [],
  });
  assert.equal(list.length, 0);
});

test("only tech-minded agencies from the register", () => {
  const list = careerCandidates({
    ads: [],
    agencies: [
      { name: "NORDIC TECH TALENT AS", website: "ntt.no", municipality: "OSLO", employees: 12 },
      { name: "BYGG OG ANLEGG BEMANNING AS", website: null, municipality: "OSLO", employees: 80 },
    ],
    existing: [],
    appliedTo: [],
  });
  assert.deepEqual(
    list.map((item) => item.name),
    ["NORDIC TECH TALENT AS"]
  );
});
