import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPANY_TEMPLATES, JOB_TEMPLATES, RECRUITER_TEMPLATES } from "./job-message-templates.ts";

const all = [...RECRUITER_TEMPLATES, ...COMPANY_TEMPLATES, ...JOB_TEMPLATES];

test("every template has a subject and a body in each version", () => {
  for (const template of all) {
    assert.ok(template.versions.length > 0, template.name);
    for (const version of template.versions) {
      assert.ok(version.subject && version.body, `${template.name} ${version.language}`);
    }
  }
});

test("each company template tells a different story", () => {
  const openings = COMPANY_TEMPLATES.map((template) => template.versions[0].subject);
  assert.equal(new Set(openings).size, COMPANY_TEMPLATES.length);
});

test("a named recruiter is greeted by first name", () => {
  assert.match(RECRUITER_TEMPLATES[0].versions[0].body, /^Hi Anna,/);
  assert.match(RECRUITER_TEMPLATES[0].versions[1].body, /^Hei Anna,/);
});

test("job templates cover the English and Norwegian letters", () => {
  assert.deepEqual(
    JOB_TEMPLATES[0].versions.map((version) => version.subject),
    ["Application: [Job title]", "Søknad: [Job title]"]
  );
});
