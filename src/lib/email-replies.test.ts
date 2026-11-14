import assert from "node:assert/strict";
import { test } from "node:test";
import {
  companyFromAddress,
  compactName,
  isGulfAddress,
  isAutoReply,
  isJobEmail,
  replyMatcher,
  replySnippet,
  type ReplyTarget,
} from "./email-replies.ts";

const job = (company: string): ReplyTarget => ({
  kind: "job",
  companyKey: company.toLowerCase(),
  company,
  contactId: null,
});

test("matches the address we wrote to, and colleagues at the same company", () => {
  const matcher = replyMatcher([{ email: "Jobs@Acme.no", target: job("Acme") }]);
  assert.equal(matcher.match("jobs@acme.no")?.company, "Acme");
  assert.equal(matcher.match("Kari.Hansen@acme.no")?.company, "Acme");
  assert.equal(matcher.match("someone@other.no"), null);
});

test("personal mail providers match only the exact address", () => {
  const matcher = replyMatcher([{ email: "anna.recruiter@gmail.com", target: job("Anna") }]);
  assert.equal(matcher.match("anna.recruiter@gmail.com")?.company, "Anna");
  assert.equal(matcher.match("stranger@gmail.com"), null);
});

test("a domain shared by two companies matches neither, but exact addresses still do", () => {
  const matcher = replyMatcher([
    { email: "post@group.no", target: job("Alpha") },
    { email: "hr@group.no", target: job("Beta") },
  ]);
  assert.equal(matcher.match("ceo@group.no"), null);
  assert.equal(matcher.match("hr@group.no")?.company, "Beta");
});

test("our own domain never matches a company", () => {
  const matcher = replyMatcher([{ email: "test@enodre.com", target: job("Test") }], ["enodre.com"]);
  assert.equal(matcher.match("someone@enodre.com"), null);
  assert.deepEqual(matcher.searchTerms(), ["test@enodre.com"]);
});

test("search terms: company domains plus addresses at shared or personal domains", () => {
  const matcher = replyMatcher([
    { email: "jobs@acme.no", target: job("Acme") },
    { email: "anna@gmail.com", target: job("Anna") },
  ]);
  assert.deepEqual(matcher.searchTerms(), ["acme.no", "anna@gmail.com"]);
});

test("out-of-office, bounces and no-reply senders are automatic", () => {
  assert.ok(isAutoReply({ subject: "Automatic reply: Application", from: "kari@acme.no" }));
  assert.ok(isAutoReply({ subject: "Autosvar: Søknad", from: "kari@acme.no" }));
  assert.ok(
    isAutoReply({ subject: "Re: Søknad", from: "kari@acme.no", headers: { "Auto-Submitted": "auto-replied" } })
  );
  assert.ok(isAutoReply({ subject: "Thanks for applying", from: "no-reply@acme.no" }));
  assert.ok(isAutoReply({ subject: "Thanks for applying", from: "jobs-noreply@teamtailor.com" }));
  assert.ok(!isAutoReply({ subject: "Re: Application", from: "noreen@acme.no" }));
  assert.ok(!isAutoReply({ subject: "Re: Application", from: "kari@acme.no", headers: { "Auto-Submitted": "no" } }));
});

test("the snippet drops the quoted message", () => {
  const text = "Hi Olga,\n\nThanks, can we talk Friday?\n\nOn Mon, 3 Nov 2026 at 10:00, Olga wrote:\n> Hello";
  assert.equal(replySnippet(text), "Hi Olga,\n\nThanks, can we talk Friday?");
  assert.equal(replySnippet("Ja takk\n> sitert"), "Ja takk");
});

test("company names lose their legal form", () => {
  assert.equal(compactName("Visma Software AS"), "vismasoftware");
  assert.equal(compactName("Sopra Steria Group"), "soprasteria");
  assert.equal(compactName("Bølgen & Moi"), "bolgenmoi");
});

test("companies applied to by form match on their domain or the sender's name", () => {
  const matcher = replyMatcher([], [], [{ company: "Sopra Steria AS", target: job("Sopra Steria") }]);
  assert.equal(matcher.match("kari@soprasteria.no")?.company, "Sopra Steria");
  assert.equal(matcher.match("kari@soprasteria-consulting.com")?.company, "Sopra Steria");
  assert.equal(matcher.match("no-reply@teamtailor.com", "Sopra Steria via Teamtailor")?.company, "Sopra Steria");
  assert.equal(matcher.match("someone@other.no", "Someone"), null);
  assert.ok(matcher.searchTerms().includes('"Sopra Steria AS"'));
});

test("short or shared names don't match by name", () => {
  const matcher = replyMatcher(
    [],
    [],
    [
      { company: "Kry", target: job("Kry") },
      { company: "Bekk Consulting AS", target: job("A") },
      { company: "Bekk Consulting", target: job("B") },
    ]
  );
  assert.equal(matcher.match("hr@kry.se"), null);
  assert.equal(matcher.match("hr@bekkconsulting.no"), null);
  assert.deepEqual(matcher.searchTerms(), []);
});

test("a personal address only matches by the sender's name", () => {
  const matcher = replyMatcher([], [], [{ company: "Sopra Steria", target: job("Sopra Steria") }]);
  assert.equal(matcher.match("soprasteria.fan@gmail.com"), null);
});

test("job emails from Sent: by subject, or a PDF to a company address", () => {
  assert.ok(isJobEmail({ subject: "Søknad: Frontend-utvikler", to: "post@acme.no", hasPdf: false }));
  assert.ok(isJobEmail({ subject: "Introduction: healthcare and technology", to: "anna@gmail.com", hasPdf: false }));
  assert.ok(isJobEmail({ subject: "Hei", to: "post@acme.no", hasPdf: true }));
  assert.ok(!isJobEmail({ subject: "Photos from Sunday", to: "mum@gmail.com", hasPdf: true }));
  assert.ok(!isJobEmail({ subject: "Dinner?", to: "friend@acme.no", hasPdf: false }));
});

test("a company name from the address", () => {
  assert.equal(companyFromAddress("kari@sopra-steria.no"), "Sopra Steria");
  assert.equal(companyFromAddress("hr@mail.visma.com"), "Visma");
  assert.equal(companyFromAddress("anna.r@gmail.com", "Anna Recruiter"), "Anna Recruiter");
  assert.equal(companyFromAddress("anna.r@gmail.com"), "anna.r@gmail.com");
});

test("acknowledgements and form rejections are automatic, wherever they come from", () => {
  assert.ok(isAutoReply({ subject: "Thank you for your application", from: "careers@acme.no" }));
  assert.ok(
    isAutoReply({ subject: "Søknad: Frontend", from: "hr@acme.no", text: "Takk for din søknad! Vi har mottatt den." })
  );
  assert.ok(
    isAutoReply({
      subject: "Re: Application",
      from: "jobs@acme.no",
      text: "Unfortunately, we have decided to move forward with other candidates.",
    })
  );
  assert.ok(isAutoReply({ subject: "Thank you for your CV!", from: "anna@recruiter.com" }));
  assert.ok(isAutoReply({ subject: "[Henvendelse mottatt]", from: "hei@aidn.no" }));
  assert.ok(
    isAutoReply({ subject: "Saken din er registrert hos Norkart (Saksnr: 444696998122)", from: "kari@norkart.no" })
  );
  assert.ok(isAutoReply({ subject: "Your application to Acme", from: "notifications@teamtailor.com" }));
  assert.ok(isAutoReply({ subject: "RE: Automatic reply: Søknad", from: "kari@acme.no" }));
  assert.ok(isAutoReply({ subject: "Dziękujemy za aplikację", from: "rekrutacja@firma.pl" }));
});

test("a person writing back is a real reply, even through a hiring system", () => {
  assert.ok(
    !isAutoReply({ subject: "Re: Åpen søknad", from: "kari@acme.no", text: "Hei Olga, kan du ta en prat på fredag?" })
  );
  assert.ok(
    !isAutoReply({
      subject: "Interview invitation",
      from: "notifications@teamtailor.com",
      text: "We would like to invite you to an interview",
    })
  );
  assert.ok(
    !isAutoReply({ subject: "Re: Application", from: "kari@acme.no", text: "Thanks Olga, I'll pass this to our CTO." })
  );
  // A named person's own polite no is still a person answering.
  assert.ok(
    !isAutoReply({
      subject: "RE: Åpen søknad",
      from: "jorgen.asphaug@geomatikk.no",
      text: "Takk for din søknad. Dessverre har vi ingen stillinger nå.",
    })
  );
  assert.ok(
    !isAutoReply({ subject: "Re: Du har fått svar fra Dignio: [#90679] Åpen søknad", from: "support@dignio.com" })
  );
});

test("Gulf addresses are recognised, others are not", () => {
  assert.ok(isGulfAddress("info@herplace.ae"));
  assert.ok(isGulfAddress("hr@clinic.com.sa"));
  assert.ok(!isGulfAddress("info@clinicamiramar.com"));
  assert.ok(!isGulfAddress("post@knowit.no"));
});
