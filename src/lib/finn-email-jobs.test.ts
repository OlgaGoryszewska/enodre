import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFinnJobs } from "./finn-email-jobs.ts";

test("reads job ads from a FINN alert email, one per ad, title from the link text", () => {
  const html = `
    <table><tr><td>
      <a href="https://www.finn.no/job/ad/412345678?utm_source=alert"><img src="logo.png"></a>
      <a href="https://www.finn.no/job/ad/412345678?utm_source=alert">Frontend-utvikler (React)</a>
      <p>Firma AS · Oslo</p>
    </td></tr><tr><td>
      <a href="https://click.finn.no/abc">Senior UX-designer</a>
    </td></tr></table>
    <a href="https://www.finn.no/job/fulltime/ad.html?finnkode=498765432">Se annonsen</a>
    <a href="https://www.finn.no/lagrede-sok">Lagrede søk</a>`;
  const resolve = (href: string) => (href.includes("click.finn.no") ? "https://www.finn.no/job/ad/411111111" : href);
  const jobs = extractFinnJobs(html, resolve);
  assert.deepEqual(
    jobs.map((job) => [job.id, job.title]),
    [
      ["412345678", "Frontend-utvikler (React)"],
      ["411111111", "Senior UX-designer"],
    ]
  );
  assert.equal(jobs[0].company, "Firma AS · Oslo");
  assert.equal(jobs[0].url, "https://www.finn.no/job/ad/412345678");
});
