import assert from "node:assert/strict";
import { test } from "node:test";
import {
  companyPath,
  inTalks,
  messagedCompanies,
  searchFilter,
  type ContactRow,
  type CompanyTracking,
  type RecruiterRow,
  type SentRow,
} from "./application-search.ts";

test("searches every column for the term", () => {
  assert.equal(searchFilter(["title", "company"], " Visma "), 'title.ilike."%Visma%",company.ilike."%Visma%"');
});

test("commas and brackets stay inside the quoted value", () => {
  assert.equal(searchFilter(["company"], "Acme, Inc (NO)"), 'company.ilike."%Acme, Inc (NO)%"');
});

test("quotes and pattern characters can't break out of the filter", () => {
  assert.equal(searchFilter(["company"], 'a"b%c*d\\e'), 'company.ilike."%a_b_c_d_e%"');
});

const sent = (id: string, company: string | null, created_at: string, extra: Partial<SentRow> = {}): SentRow => ({
  id,
  created_at,
  kind: "ad",
  company,
  to_email: `jobs@${id}.no`,
  subject: `Subject ${id}`,
  body: "Hello",
  ...extra,
});

const contact = (id: string, name: string, status: string, extra: Partial<ContactRow> = {}): ContactRow => ({
  id,
  kind: "agency",
  name,
  organisation: null,
  email: null,
  website: null,
  linkedin: null,
  status,
  last_contacted_on: "2026-10-01",
  notes: null,
  ...extra,
});

test("one row per company, newest first, whatever the capitals", () => {
  const rows = messagedCompanies(
    [
      sent("a", "Visma", "2026-10-01T08:00:00Z"),
      sent("b", "VISMA ", "2026-10-05T08:00:00Z"),
      sent("c", "Sopra", "2026-10-03T08:00:00Z"),
    ],
    []
  );
  assert.deepEqual(
    rows.map((row) => [row.company, row.what]),
    [
      ["VISMA ", "2 messages"],
      ["Sopra", "Subject c"],
    ]
  );
  assert.equal(rows[0].contact, "jobs@b.no, jobs@a.no");
});

test("a reply or an interview shows instead of Sent", () => {
  const rows = messagedCompanies(
    [
      sent("a", "Storm3", "2026-10-02T08:00:00Z"),
      sent("b", "Visma", "2026-10-01T08:00:00Z", { job_postings: { status: "interview" } }),
    ],
    [contact("c", "Storm3", "replied")]
  );
  assert.deepEqual(
    rows.map((row) => row.status),
    ["Replied", "Interview"]
  );
});

test("contacts marked by hand are listed, those not yet contacted are not", () => {
  const rows = messagedCompanies([], [contact("a", "Borka", "contacted"), contact("b", "Antal", "to_contact")]);
  assert.deepEqual(
    rows.map((row) => [row.company, row.status]),
    [["Borka", "Sent"]]
  );
});

const tracked = (key: string, extra: Partial<CompanyTracking> = {}): CompanyTracking => ({
  key,
  company: key,
  status: null,
  note: "",
  ...extra,
});

test("your own status and note beat what the messages say", () => {
  const [row] = messagedCompanies(
    [sent("a", "Visma", "2026-10-01T08:00:00Z", { job_postings: { status: "interview" } })],
    [],
    [tracked("visma", { status: "declined", note: "Maybe next year" })]
  );
  assert.equal(row.status, "Declined");
  assert.equal(row.note, "Maybe next year");
});

test("a note alone leaves the status as it was", () => {
  const [row] = messagedCompanies([sent("a", "Visma", "2026-10-01T08:00:00Z")], [], [tracked("visma", { note: "Hi" })]);
  assert.equal(row.status, "Sent");
});

test("a company tracked without a message is still listed", () => {
  const rows = messagedCompanies([], [], [tracked("sopra", { company: "Sopra", status: "contact_them" })]);
  assert.deepEqual(
    rows.map((row) => [row.company, row.status, row.what]),
    [["Sopra", "Contact them", "Not messaged"]]
  );
});

test("company names survive the page address", () => {
  assert.equal(companyPath("a/b & co"), "/admin/linkedin/company/a%2Fb%20%26%20co");
});

test("in talks: anyone who answered, not those waiting or declined", () => {
  const rows = messagedCompanies(
    [
      sent("a", "Replied Co", "2026-10-01T08:00:00Z"),
      sent("b", "Silent Co", "2026-10-01T08:00:00Z"),
      sent("c", "Talking Co", "2026-10-01T08:00:00Z"),
      sent("d", "Declined Co", "2026-10-01T08:00:00Z"),
    ],
    [contact("e", "Replied Co", "replied")],
    [tracked("talking co", { status: "talking" }), tracked("declined co", { status: "declined" })]
  );
  assert.deepEqual(
    inTalks(rows)
      .map((row) => row.company)
      .sort(),
    ["Replied Co", "Talking Co"]
  );
});

const recruiter = (id: string, title: string, extra: Partial<RecruiterRow> = {}): RecruiterRow => ({
  id,
  created_at: "2026-10-01T08:00:00Z",
  title,
  company: null,
  url: null,
  note: null,
  proposal_sent: true,
  ...extra,
});

test("recruiters we contacted are listed by agency, others are not", () => {
  const rows = messagedCompanies(
    [],
    [],
    [],
    [
      recruiter("a", "Sarah Cohen", { company: "Storm3" }),
      recruiter("b", "Tom Lee", { company: "storm3" }),
      recruiter("c", "Ann Berg"),
      recruiter("d", "Not Yet", { company: "Antal", proposal_sent: false }),
    ]
  );
  assert.deepEqual(rows.map((row) => row.what).sort(), ["Recruiter · Ann Berg", "Recruiter · Sarah Cohen, Tom Lee"]);
});

test("an agency we already messaged keeps one row", () => {
  const rows = messagedCompanies(
    [sent("a", "Storm3", "2026-10-01T08:00:00Z")],
    [],
    [],
    [recruiter("b", "Sarah Cohen", { company: "Storm3" })]
  );
  assert.equal(rows.length, 1);
});

test("a reply in the inbox shows as Replied, unless you've set another status", () => {
  const rows = messagedCompanies(
    [
      sent("a", "Visma", "2026-10-01T08:00:00Z"),
      sent("b", "Sopra", "2026-10-01T08:00:00Z"),
      sent("c", "Kry", "2026-10-01T08:00:00Z"),
    ],
    [],
    [tracked("sopra", { status: "declined" }), tracked("kry", { status: "waiting" })],
    [],
    ["visma", "sopra", "kry"].map((key) => ({ key, company: key, date: "2026-10-02T08:00:00Z" }))
  );
  assert.deepEqual(Object.fromEntries(rows.map((row) => [row.company, row.status])), {
    Visma: "Replied",
    Sopra: "Declined",
    Kry: "Replied",
  });
});

test("a company known only from its reply gets its own row", () => {
  const rows = messagedCompanies([], [], [], [], [{ key: "acme", company: "Acme", date: "2026-10-02T08:00:00Z" }]);
  assert.deepEqual(
    rows.map((row) => [row.company, row.status]),
    [["Acme", "Replied"]]
  );
});

test("companies you removed leave the table, a company you only tracked does too", () => {
  const rows = messagedCompanies(
    [sent("a", "Visma", "2026-10-01T08:00:00Z"), sent("b", "Sopra", "2026-10-01T08:00:00Z")],
    [],
    [tracked("visma", { hidden: true }), tracked("kry", { company: "Kry", status: "talking", hidden: true })]
  );
  assert.deepEqual(
    rows.map((row) => row.company),
    ["Sopra"]
  );
});

test("rows remember the worked-out status under your own", () => {
  const [row] = messagedCompanies(
    [sent("a", "Visma", "2026-10-01T08:00:00Z")],
    [],
    [tracked("visma", { status: "declined" })]
  );
  assert.deepEqual([row.status, row.tracked, row.autoStatus], ["Declined", "declined", "Sent"]);
});
