import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contactLinks,
  extractEmails,
  guessDomains,
  isCompanyAddress,
  hostOf,
  isGenericAddress,
  pageMentions,
  rankEmails,
} from "./email-discovery.ts";

test("extracts addresses from text, mailto links and obfuscated forms", () => {
  const html = `<a href="mailto:Post@Xlent.no">Post@Xlent.no</a> Kontakt: kari.nordmann(at)xlent.no.
    <img src="logo@2x.png"> noreply@xlent.no hei&#64;studio.no`;
  assert.deepEqual(extractEmails(html).sort(), ["hei@studio.no", "kari.nordmann@xlent.no", "post@xlent.no"]);
});

test("generic company addresses are told apart from personal ones", () => {
  assert.ok(isGenericAddress("post@firma.no"));
  assert.ok(isGenericAddress("kontakt@firma.no"));
  assert.ok(isGenericAddress("info@firma.no"));
  assert.ok(!isGenericAddress("jan.petter@firma.no"));
});

test("ranking prefers generic addresses on the company's own domain", () => {
  const ranked = rankEmails(
    [
      { email: "jan@xlent.no", generic: false, source: "a" },
      { email: "post@gmail.com", generic: true, source: "a" },
      { email: "post@xlent.no", generic: true, source: "b" },
    ],
    hostOf("https://www.xlent.no")
  );
  assert.deepEqual(
    ranked.map((item) => item.email),
    ["post@xlent.no", "post@gmail.com", "jan@xlent.no"]
  );
});

test("guesses likely domains from the company name", () => {
  const guesses = guessDomains("AUNE MASKIN AS");
  assert.ok(guesses.includes("aunemaskin.no"));
  assert.ok(guesses.includes("aune-maskin.no"));
  assert.ok(guessDomains("Bjørnstad Rør AS").includes("bjornstadror.no"));
  assert.ok(guessDomains("Bjørnstad Rør AS").includes("bjoernstadroer.no"));
});

test("a guessed site counts only if it names the company; contact links stay on the site", () => {
  assert.ok(pageMentions("<title>Aune Maskin – graving</title>", "AUNE MASKIN AS"));
  assert.ok(!pageMentions("<title>Domain for sale</title>", "AUNE MASKIN AS"));
  // One common word isn't enough — the org number is.
  assert.ok(!pageMentions("<title>Folk</title>", "FOLK AS"));
  assert.ok(pageMentions("<footer>Org.nr. 912 345 678</footer>", "FOLK AS", "912345678"));
  assert.deepEqual(
    contactLinks('<a href="/kontakt-oss">Kontakt</a> <a href="https://facebook.com/contact">fb</a>', "aunemaskin.no"),
    ["https://aunemaskin.no/kontakt-oss"]
  );
});

test("company addresses: general names, the company's own name, the domain — not the contact person", () => {
  assert.ok(isCompanyAddress("carlcfon@carlcfon.no", { company: "CARL C FON AS" }));
  assert.ok(isCompanyAddress("kranringen@kranringen.no", { company: "KRANRINGEN AS" }));
  assert.ok(isCompanyAddress("post.trondheim@firma.no"));
  assert.ok(isCompanyAddress("knapphus@knapphus-energi.no", { company: "Knapphus Energi AS" }));
  assert.ok(!isCompanyAddress("ola.nordmann@firma.no", { company: "Firma AS", person: "Ola Nordmann" }));
  assert.ok(!isCompanyAddress("ottar@augdal.no", { company: "Ottar Augdal AS", person: "Ottar Augdal" }));
  assert.ok(!isCompanyAddress("kari@firma.no", { company: "Firma AS" }));
});

test("domain guesses include the name without trade words", () => {
  assert.ok(guessDomains("FOSSLI MASKIN OG TRANSPORT AS").includes("fossli.no"));
  assert.ok(guessDomains("LETNES ENTREPRENØR AS").includes("letnes.no"));
  assert.ok(guessDomains("FLOW TRØNDELAG VVS AS").includes("flowtrondelag.no"));
  assert.ok(pageMentions("<title>Hjem - Fossli AS</title>", "FOSSLI MASKIN OG TRANSPORT AS"));
  assert.ok(pageMentions("<title>Maskinentreprenør - Steintransport AS</title>", "STEINTRANSPORT AS"));
  assert.ok(!pageMentions("<title>Elcom international</title>", "ELCOM AS"));
});

test("short office tags and Cloudflare-hidden addresses", () => {
  assert.ok(isCompanyAddress("posttr@flow-vvs.no"));
  // "post@firma.no" hidden by Cloudflare (key 0x42).
  const hex = "42" + [..."post@firma.no"].map((c) => (c.charCodeAt(0) ^ 0x42).toString(16).padStart(2, "0")).join("");
  assert.deepEqual(extractEmails(`<a data-cfemail="${hex}">[email&#160;protected]</a>`), ["post@firma.no"]);
});
