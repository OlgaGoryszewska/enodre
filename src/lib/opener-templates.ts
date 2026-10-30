// Opening sentences (part A) written without AI, from what's on record:
// a verified fact in the message's language, or the register profile
// (company, industry, municipality). Pure, no imports (unit-tested).

type Language = "no" | "en";

const NORWEGIAN_WORDS = /\b(og|ikke|dere|har|med|på|til|som|er|av|det|en|et|fra|nye?|siden|ansatte|kunder)\b/gi;
const ENGLISH_WORDS = /\b(the|and|with|for|of|is|are|has|have|new|from|their|its|employees|customers)\b/gi;

/** Rough language guess for a short fact: Norwegian or English. */
export function factLanguage(text: string): Language {
  const no = (text.match(NORWEGIAN_WORDS) ?? []).length + (/[æøå]/i.test(text) ? 2 : 0);
  const en = (text.match(ENGLISH_WORDS) ?? []).length;
  return no > en ? "no" : "en";
}

const LEGAL_SUFFIX = /\s+(AS|ASA|ANS|DA|NUF|SA|BA|KS|ENK)$/i;

/** "AUNE MASKIN AS" -> "Aune Maskin"; mixed-case names are kept as written. */
export function displayCompanyName(name: string) {
  const bare = name.trim().replace(LEGAL_SUFFIX, "").trim();
  return bare === bare.toUpperCase() ? titleCase(bare) : bare;
}

/** "TRONDHEIM" -> "Trondheim", "NORD-FRON" -> "Nord-Fron". */
export function titleCase(text: string) {
  return text
    .toLowerCase()
    .replace(/(^|[\s\-–/])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "I read about you on aunemaskin.no: <fact>." — only for a fact in the message's language. */
export function factOpening(fact: { fact: string; source_url: string }, language: Language) {
  if (factLanguage(fact.fact) !== language) return null;
  const host = hostOf(fact.source_url);
  const text = fact.fact.trim().replace(/[.!]+$/, "");
  if (!text || text.length > 200) return null;
  if (language === "no") return host ? `Jeg leste om dere på ${host}: ${text}.` : `Jeg leste om dere: ${text}.`;
  return host ? `I read about you on ${host}: ${text}.` : `I read about you: ${text}.`;
}

/**
 * "Jeg kom over Aune Maskin – jeg ser at dere driver med bygg og anlegg i
 * Trondheim." From register data only, so it's true but less personal.
 */
export function profileOpening(
  input: { company: string | null; location: string | null; activity: { no: string; en: string } | null },
  language: Language
) {
  if (!input.company || !input.activity) return null;
  const name = displayCompanyName(input.company);
  // Register municipalities are upper case; a free-text location is kept as is.
  const place = input.location
    ? input.location === input.location.toUpperCase()
      ? titleCase(input.location)
      : input.location
    : null;
  const where = place ? (language === "no" ? ` i ${place}` : ` in ${place}`) : "";
  return language === "no"
    ? `Jeg kom over ${name} – jeg ser at dere ${input.activity.no}${where}.`
    : `I came across ${name} – I see you ${input.activity.en}${where}.`;
}

// ---------------------------------------------------------------------------
// Job-ad titles are often sentences ("Vi er på jakt etter Senior
// Systemutviklere!", "Bli med … som Fullstack utvikler i Spond!"). These pull
// out the role so the opening can name it.

const AD_LEAD_IN =
  /^(vi (er på jakt etter|søker( etter)?|ser etter|trenger)|we('re| are) (looking for|hiring)|join us as( an?)?|bli( vår| med som)?)\s+/i;
const ROLE_WORD = "(?:utvikler|developer|designer|designar|engineer|ingeniør|arkitekt|programmerer)";
const ROLE_PHRASE = new RegExp(
  `((?:[\\p{L}.+#/-]+\\s){0,2}[\\p{L}.+#/-]*${ROLE_WORD}(?:e|er|ere|s)?)(?![\\p{L}])`,
  "iu"
);
const LEADING_FILLER = /^((som|en|et|ei|ny|nye|vår|our|a|an|as|new|the|dere|you|søker|bli)\s+)+/i;

/** "Senior" -> "senior", but ".NET", "iOS", "UX" and "C#" stay as written. */
function lowerTitleWords(text: string) {
  return text
    .split(/\s+/)
    .map((word) => (/^\p{Lu}[\p{Ll}-]+$/u.test(word) ? word.toLowerCase() : word))
    .join(" ");
}

/** The role in a job-ad title, e.g. "senior systemutviklere" (plural) — null if none is clear. */
export function roleFromAdTitle(rawTitle: string): { role: string; plural: boolean } | null {
  const title = rawTitle
    .split(" | ")[0]
    .replace(/[!?.]+$/g, "")
    .trim();
  const afterLeadIn = title.replace(AD_LEAD_IN, "");
  const match =
    (afterLeadIn !== title && afterLeadIn.length <= 50 ? afterLeadIn : null) ?? title.match(ROLE_PHRASE)?.[1];
  if (!match) return null;
  const role = lowerTitleWords(
    match
      // "Skytale søker fullstack-utvikler" -> "fullstack-utvikler"
      .replace(/^.*\b(søker|seeks|is hiring|hires)\s+/i, "")
      .replace(LEADING_FILLER, "")
      .replace(/[!?.,:;]+$/g, "")
      .trim()
  );
  if (!role || role.length > 50 || !new RegExp(ROLE_WORD, "i").test(role)) return null;
  return { role, plural: /(ere|ers|s)$/i.test(role) && !/(ss|us)$/i.test(role) };
}

/** "Jeg så at dere søker senior systemutviklere." / "… søker en fullstack-utvikler." */
export function roleOpening(found: { role: string; plural: boolean }, language: Language) {
  if (language === "no") return `Jeg så at dere søker ${found.plural ? "" : "en "}${found.role}.`;
  const article = found.plural ? "" : /^[aeiou]/i.test(found.role) ? "an " : "a ";
  return `I saw that you're looking for ${article}${found.role}.`;
}
