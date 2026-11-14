import { compactName } from "./email-replies.ts";

// Which address an open application may go to. Pure, so it's unit-tested.

const VALID =
  /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;

// Inboxes for customers, money or legal matters: a job application there
// looks careless, and nobody forwards it.
const NOT_FOR_JOBS = new Set([
  "support",
  "sales",
  "salg",
  "kundeservice",
  "kunde",
  "kunder",
  "customer",
  "customers",
  "customerservice",
  "customercare",
  "service",
  "marketing",
  "markedsforing",
  "compliance",
  "faktura",
  "invoice",
  "invoices",
  "billing",
  "regnskap",
  "accounting",
  "ordre",
  "order",
  "orders",
  "booking",
  "noreply",
  "no-reply",
  "donotreply",
  "press",
  "presse",
  "media",
  "abuse",
  "privacy",
  "gdpr",
  "personvern",
  "dpo",
  "legal",
  "webmaster",
  "helpdesk",
  "servicedesk",
]);

// Second-level domains where the company's name sits one label further in.
const SHARED_SUFFIX = /\.(co|com|org|net|ac|gov)\.[a-z]{2}$/;

function baseDomain(host: string) {
  const labels = host
    .toLowerCase()
    .replace(/^www\./, "")
    .split(".");
  return labels.slice(SHARED_SUFFIX.test(host) ? -3 : -2).join(".");
}

function hostOf(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Why an address isn't right for an open application, or null when it is:
 * a real address, not a customer or billing inbox, on the company's own domain
 * (its website's, or one that carries its name).
 */
export function addressProblem(email: string, company: { name: string; website: string | null }) {
  const address = email.trim().toLowerCase();
  if (!VALID.test(address)) return "not a valid email address";
  const [local, domain] = address.split("@");
  if (local.split(/[._+-]/).some((part) => NOT_FOR_JOBS.has(part)) || NOT_FOR_JOBS.has(local)) {
    return `${local}@ is a customer or business inbox`;
  }
  const site = company.website ? hostOf(company.website) : null;
  if (site && baseDomain(site) === baseDomain(domain)) return null;
  const label = compactName(baseDomain(domain).split(".")[0]);
  const name = compactName(company.name);
  if (label.length >= 3 && name.length >= 2 && (name.includes(label) || label.includes(name))) return null;
  return `${domain} isn't the company's own domain`;
}

/** Midnight in Oslo for the day `now` falls on, as an instant (for "sent today"). */
export function osloStartOfDay(now = new Date()) {
  const day = now.toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Oslo", timeZoneName: "longOffset" })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "") || "+00:00";
  const start = new Date(`${day}T00:00:00${offset}`);
  // Across a clock change the offset at midnight differs by an hour; never land after now.
  return start.getTime() > now.getTime() ? new Date(start.getTime() - 3_600_000) : start;
}

/**
 * A big foreign company's Norwegian branch ("TikTok Norway AS" on tiktok.com):
 * hiring happens elsewhere, so an open application to its general inbox goes
 * nowhere.
 */
export function isForeignBranch(company: { name: string; website: string | null }) {
  if (!/\b(norway|norge)\b/i.test(company.name)) return false;
  const site = company.website ? hostOf(company.website) : null;
  return !site || !site.endsWith(".no");
}
