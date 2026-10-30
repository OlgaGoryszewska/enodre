// Personalisation quality check for outreach messages — rule-based, no AI, so
// it's instant, free and predictable. Errors block approval; warnings are
// shown with a suggestion and can be accepted. Pure, no imports (unit-tested).

export type QualityLevel = "error" | "warning" | "info";
export type QualityIssue = { id: string; level: QualityLevel; title: string; suggestion: string };

export type QualityInput = {
  kind: string; // connection_note | first_message | email | follow_up | final_follow_up | phone_opener
  language: "no" | "en";
  body: string;
  companyName: string | null;
  verifiedFacts: string[]; // facts with a source, in any language
};

const FIRST_TOUCH = ["first_message", "email", "connection_note"];
const SALESY = [
  "revolusjonerende",
  "banebrytende",
  "unik mulighet",
  "garantert",
  "verdensklasse",
  "kampanje",
  "gratis",
  "tilbud",
  "ai-drevet",
  "game changer",
  "game-changer",
  "revolutionary",
  "guaranteed",
  "world-class",
  "limited offer",
  "free trial",
];
// Assuming the prospect HAS a problem, rather than asking.
const ASSUMED_PROBLEM =
  /\b(dere (har|sliter med|kaster bort)|deres (problem|utfordring|rot|kaos)|you (have|are struggling|waste)|your (problem|mess|chaos))\b/i;
const ENGLISH_IN_NORWEGIAN = /\b(the|and|we|your|our|with|this|that|hello|regards)\b/i;
// Field-service value (workflow, automation) or partner value (extra capacity).
const VALUE_WORDS =
  /(forenkl|automatis|dobbeltarbeid|arbeidsflyt|manuell|kapasitet|underleverandør|simplif|automat|duplicate|workflow|manual|capacity|subcontract|white-label)/i;
// A 5-minute talk is a small ask and fine; longer meetings and demos are flagged.
const MEETING = /(1[05]\s*minutt|30\s*minutt|møte|demo|book(e)? en|meeting|demo call|book a)/i;

const significantWords = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 5)
  );

export function checkMessage(input: QualityInput): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const body = input.body.trim();
  const text = body.toLowerCase();
  const firstTouch = FIRST_TOUCH.includes(input.kind);
  const add = (id: string, level: QualityLevel, title: string, suggestion: string) =>
    issues.push({ id, level, title, suggestion });

  if (!body) {
    add("empty", "error", "The message is empty", "Write or generate a message first.");
    return issues;
  }

  // 1. Placeholder left in.
  if (/\[[^\]]{3,}\]/.test(body)) {
    add(
      "placeholder",
      "error",
      "The opening hasn't been written",
      "Replace the bracketed line with a verified fact — or a plain, honest opening."
    );
  }

  // 2. Is the opening about them?
  if (firstTouch) {
    const name = (input.companyName ?? "")
      .replace(/\b(AS|ASA|ANS|DA|NUF)\b/gi, "")
      .trim()
      .toLowerCase();
    const mentionsCompany = Boolean(name) && text.includes(name.split(/\s+/)[0]);
    const words = significantWords(body);
    const usesFact = input.verifiedFacts.some(
      (fact) => [...significantWords(fact)].filter((w) => words.has(w)).length >= 2
    );
    if (!mentionsCompany && !usesFact) {
      if (input.verifiedFacts.length === 0) {
        add(
          "generic",
          "info",
          "Generic opening (no verified facts yet)",
          "Fine when nothing is verified. Research the company to personalise it."
        );
      } else {
        add(
          "generic",
          "warning",
          "The opening doesn't use what you know about them",
          "Open with one of the verified facts on the right, in your own words."
        );
      }
    }
  }

  // 3. Specific claims that aren't backed by a verified fact.
  const evidence = [input.companyName ?? "", ...input.verifiedFacts].join(" ");
  const numbers = [...new Set(body.match(/\b\d{2,}\b/g) ?? [])].filter((n) => n !== "15" && n !== "20");
  for (const number of numbers) {
    if (!evidence.includes(number)) {
      add(
        `unverified-${number}`,
        "warning",
        `“${number}” isn't in the verified facts`,
        "Only state numbers and dates you've checked against a source."
      );
    }
  }
  if (ASSUMED_PROBLEM.test(body)) {
    add(
      "assumed-problem",
      "warning",
      "It assumes they have a problem",
      "Ask how they handle it today instead of stating that they have a problem."
    );
  }

  // 4. Natural Norwegian.
  if (input.language === "no") {
    if (ENGLISH_IN_NORWEGIAN.test(body)) {
      add(
        "english",
        "warning",
        "English words in a Norwegian message",
        "Check the wording reads as natural Norwegian."
      );
    }
    if (/\bI Enodre (vi|jeg)\b/.test(body)) {
      add(
        "word-order",
        "warning",
        "Word order: “I Enodre vi …”",
        "Norwegian puts the verb second: “I Enodre hjelper vi …”."
      );
    }
  }

  // 5. One clear question.
  const questions = (body.match(/\?/g) ?? []).length;
  // The final follow-up invites a reply or a "no thanks" without asking anything.
  if (questions === 0 && input.kind !== "connection_note" && input.kind !== "final_follow_up") {
    add(
      "no-question",
      "warning",
      "No question to reply to",
      "End with one simple question, e.g. “Hvordan løser dere dette i dag?”."
    );
  }
  if (questions > 2) {
    add(
      "many-questions",
      "warning",
      `${questions} questions`,
      "Ask about one or two things — more feels like a survey."
    );
  }

  // 6. Clear value.
  if (["first_message", "email"].includes(input.kind) && !(text.includes("enodre") && VALUE_WORDS.test(body))) {
    add(
      "value",
      "warning",
      "The value isn't clear",
      "Add one plain sentence on how Enodre helps (less duplicate work, simpler field-to-office flow)."
    );
  }

  // 7. Concise.
  const words = body.split(/\s+/).length;
  const limit = firstTouch ? 120 : 70;
  if (input.kind === "connection_note" && body.length > 300) {
    add("too-long", "error", `${body.length} characters — LinkedIn allows 300`, "Shorten the note.");
  } else if (words > limit) {
    add("too-long", "warning", `${words} words — long for this kind of message`, `Aim for under ${limit} words.`);
  }

  // 8. Sales language.
  const salesy = SALESY.filter((phrase) => text.includes(phrase));
  if (salesy.length > 0) {
    add("salesy", "warning", `Sales language: ${salesy.join(", ")}`, "Plain words read like a person, not a campaign.");
  }

  // 9. First messages keep the ask small: a 5-minute talk, not a meeting or demo.
  if (["first_message", "connection_note"].includes(input.kind) && MEETING.test(body)) {
    add(
      "meeting-ask",
      "info",
      "Asks for a meeting or demo in the first message",
      "Keep the first ask small — “Er du åpen for en kort prat på 5 minutter?”"
    );
  }

  return issues;
}

export function isReady(issues: QualityIssue[]) {
  return !issues.some((issue) => issue.level === "error");
}
