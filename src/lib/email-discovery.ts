// Finds a company's general email address (post@, kontakt@, …) on its own
// website. Cold email in Norway may only go to such company addresses, not to
// a named person (markedsføringsloven §15), so generic ones are preferred and
// personal-looking ones are only offered with a warning. No imports, so the
// pure helpers are unit-tested.

// Local parts that mean "the company", not a person.
const GENERIC_LOCAL =
  /^(post|postmottak|mottak|firmapost|kontakt|kontor|contact|info|hei|hallo|hello|hi|salg|sales|office|mail|epost|admin|support|kundeservice|kunde|service|booking|bestilling|ordre|tilbud|faktura|jobb|team|studio)$/i;
// Addresses that aren't for business contact.
const IGNORED_LOCAL =
  /^(noreply|no-reply|donotreply|privacy|personvern|gdpr|abuse|postmaster|webmaster|example|name|navn|din|your)$/i;
const IGNORED_DOMAIN = /(example\.|sentry|wixpress|domain\.|email\.com$|\.png$|\.jpg$|\.webp$|\.svg$|\.gif$)/i;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Pages where contact details usually live, tried after the front page.
const CONTACT_PATHS = ["/kontakt", "/kontakt-oss", "/contact", "/contact-us", "/om-oss", "/about"];
const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 600_000;

export type FoundEmail = { email: string; generic: boolean; source: string };

export function isGenericAddress(email: string) {
  const local = email.split("@")[0] ?? "";
  // "post@", and "post.trondheim@" / "kontakt-oslo@" (a general box per office)
  if (GENERIC_LOCAL.test(local) || GENERIC_LOCAL.test(local.split(/[.\-_0-9]/)[0] ?? "")) return true;
  // "posttr@", "infooslo@": a general word plus a short office tag.
  const prefix = local.match(/^(post|kontakt|info|firmapost|salg|ordre|mail)([a-z]{1,4})$/i);
  return Boolean(prefix);
}

const letters = (text: string) =>
  text
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "o")
    .replace(/[å]/g, "a")
    .replace(/[^a-z0-9]/g, "");

/**
 * Is this the company's own address rather than a person's? General names
 * (post@, kontakt@ …), the company's name (carlcfon@carlcfon.no,
 * kranringen@…), or the same as the domain. An address with the contact
 * person's name in it counts as personal — §15 allows cold email only to
 * company addresses.
 */
export function isCompanyAddress(email: string, names: { company?: string | null; person?: string | null } = {}) {
  if (isGenericAddress(email)) return true;
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  const plainLocal = letters(local);
  const domainLabel = letters(domain.split(".").slice(-2, -1)[0] ?? "");
  if (plainLocal.length >= 3 && plainLocal === domainLabel) return true;
  const personWords = (names.person ?? "")
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 3)
    .map(letters);
  if (personWords.some((word) => plainLocal.includes(word))) return false;
  const companyWords = names.company ? coreWords(names.company).map(letters) : [];
  return companyWords.some((word) => word.length >= 4 && plainLocal.includes(word));
}

export function hostOf(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Email addresses in a page (text and mailto: links), lower-cased, de-duplicated. */
/** Cloudflare's email obfuscation: a hex string, XOR-ed with its first byte. */
function decodeCloudflare(hex: string) {
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

export function extractEmails(html: string) {
  const cloudflare = [...html.matchAll(/(?:data-cfemail="|email-protection#)([0-9a-f]{8,})/gi)].map((match) =>
    decodeCloudflare(match[1])
  );
  const decoded = [html, ...cloudflare]
    .join(" ")
    .replace(/&#64;|&commat;|\[at\]|\(at\)/gi, "@")
    .replace(/%40/g, "@");
  const found = new Set<string>();
  for (const match of decoded.match(EMAIL) ?? []) {
    const email = match.toLowerCase().replace(/\.$/, "");
    const [local, domain] = email.split("@");
    if (!local || !domain || IGNORED_LOCAL.test(local) || IGNORED_DOMAIN.test(domain)) continue;
    found.add(email);
  }
  return [...found];
}

/** Best first: generic on the company's own domain, then other generic, then the rest. */
export function rankEmails(emails: FoundEmail[], companyHost: string | null) {
  const score = (item: FoundEmail) => {
    const domain = item.email.split("@")[1] ?? "";
    const ownDomain = companyHost !== null && (domain === companyHost || domain.endsWith(`.${companyHost}`));
    return (item.generic ? 0 : 2) + (ownDomain ? 0 : 1);
  };
  const unique = new Map<string, FoundEmail>();
  for (const item of emails) if (!unique.has(item.email)) unique.set(item.email, item);
  return [...unique.values()].sort((a, b) => score(a) - score(b));
}

async function fetchPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EnodreLeadFinder/1.0; +https://enodre.com)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      cache: "no-store",
    });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return null;
    return (await response.text()).slice(0, MAX_BYTES);
  } catch {
    return null;
  }
}

const LEGAL_SUFFIX = /\s+(AS|ASA|ANS|DA|NUF|SA|BA|KS|ENK)$/i;

/** "Aune Maskin AS" -> ["aune", "maskin"] — the name's words, for matching a page. */
function nameWords(companyName: string) {
  return companyName
    .replace(LEGAL_SUFFIX, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !["and", "og", "the", "avd"].includes(word));
}

// Trade words companies often leave out of their domain ("Fossli Maskin og Transport AS" -> fossli.no).
const TRADE_WORDS = new Set([
  "entreprenør",
  "entreprenor",
  "entreprenører",
  "transport",
  "maskin",
  "maskiner",
  "vvs",
  "rør",
  "elektro",
  "bygg",
  "anlegg",
  "service",
  "group",
  "gruppen",
  "norge",
  "norway",
  "holding",
  "consulting",
  "tech",
  "data",
]);

/** The name without trade words: "Fossli Maskin og Transport AS" -> ["fossli"]. */
function coreWords(companyName: string) {
  const words = nameWords(companyName);
  const core = words.filter((word) => !TRADE_WORDS.has(word));
  return core.length > 0 ? core : words;
}

/**
 * Likely websites for a company without one in the register: "Aune Maskin AS"
 * -> aunemaskin.no, aune-maskin.no, aunemaskin.com … Only used once the page
 * is checked to mention the company (pageMentions).
 */
export function guessDomains(companyName: string) {
  const words = nameWords(companyName);
  if (words.length === 0) return [];
  const core = coreWords(companyName);
  const ascii = (text: string, map: Record<string, string>) => text.replace(/[æøå]/g, (letter) => map[letter]);
  const short = { æ: "ae", ø: "o", å: "a" };
  const long = { æ: "ae", ø: "oe", å: "aa" };
  // Full name, name without trade words, first word — joined and hyphenated.
  const variants = [words, core, words.slice(0, 1)];
  const stems = new Set<string>();
  for (const map of [short, long]) {
    for (const variant of variants) {
      stems.add(ascii(variant.join(""), map));
      if (variant.length > 1) stems.add(ascii(variant.join("-"), map));
    }
  }
  const clean = [...stems].map((stem) => stem.replace(/[^a-z0-9-]/g, "")).filter((stem) => stem.length >= 4);
  return clean.flatMap((stem) => [`${stem}.no`, `${stem}.com`]).slice(0, 14);
}

/**
 * Is a guessed page really this company's? Yes if it shows the org number
 * (Norwegian sites usually do, in the footer), or — for a name of two or more
 * words — if every word is in the page title. A one-word name ("Folk") is
 * too common to trust on its own.
 */
export function pageMentions(html: string, companyName: string, orgNumber?: string | null) {
  const digits = orgNumber?.replace(/\D/g, "");
  if (digits && digits.length === 9 && html.replace(/[\s.\u00a0]/g, "").includes(digits)) return true;
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").toLowerCase();
  const words = nameWords(companyName);
  if (words.length >= 2 && words.every((word) => title.includes(word))) return true;
  // The distinctive part of the name in the title: "Fossli" for Fossli Maskin
  // og Transport, "Steintransport". Short common names ("Folk") don't count.
  const core = coreWords(companyName);
  return core.join("").length >= 6 && core.every((word) => title.includes(word));
}

/** Same-site links that look like a contact page, from the front page. */
export function contactLinks(html: string, host: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const href = match[1];
    if (!/(kontakt|contact|om-oss|about)/i.test(href)) continue;
    try {
      const url = new URL(href, `https://${host}`);
      if (url.hostname.replace(/^www\./, "") === host) links.add(url.href);
    } catch {
      // not a URL
    }
  }
  return [...links].slice(0, 4);
}

/**
 * Email addresses for a company: the one in the register (if given), then
 * its website — the front page, the contact pages it links to, and the usual
 * contact paths. With no website, likely domains are tried and kept only if
 * the page names the company. Stops at a general address on its own domain.
 * Free — plain page fetches, no AI. Returns the website it used, too.
 */
export async function findCompanyEmails(input: {
  website: string | null;
  registerEmail?: string | null;
  companyName?: string | null;
  orgNumber?: string | null;
  contactName?: string | null;
}): Promise<{ emails: FoundEmail[]; website: string | null }> {
  const names = { company: input.companyName, person: input.contactName };
  const results: FoundEmail[] = [];
  if (input.registerEmail) {
    const email = input.registerEmail.trim().toLowerCase();
    results.push({ email, generic: isCompanyAddress(email, names), source: "Brønnøysund register" });
  }

  let host = hostOf(input.website);
  let front: string | null = null;
  if (host) {
    front = (await fetchPage(`https://${host}`)) ?? (await fetchPage(`http://${host}`));
  } else if (input.companyName) {
    // All guesses at once (most don't exist and fail fast); first match in order wins.
    const guesses = guessDomains(input.companyName);
    const pages = await Promise.all(guesses.map((guess) => fetchPage(`https://${guess}`)));
    const index = pages.findIndex((html) => html && pageMentions(html, input.companyName!, input.orgNumber));
    if (index >= 0) {
      host = guesses[index];
      front = pages[index];
    }
  }
  if (!host) return { emails: rankEmails(results, null), website: null };

  const done = () => {
    const best = rankEmails(results, host)[0];
    return Boolean(best?.generic && (best.email.endsWith(`@${host}`) || best.email.endsWith(`.${host}`)));
  };
  const collect = (html: string, source: string) => {
    for (const email of extractEmails(html)) results.push({ email, generic: isCompanyAddress(email, names), source });
  };

  if (front) collect(front, `https://${host}/`);
  const pages = [...(front ? contactLinks(front, host) : []), ...CONTACT_PATHS.map((path) => `https://${host}${path}`)];
  const tried = new Set<string>();
  for (const page of pages) {
    if (done()) break;
    const key = page.replace(/\/$/, "");
    if (tried.has(key)) continue;
    tried.add(key);
    const html = await fetchPage(page);
    if (html) collect(html, page);
  }
  return { emails: rankEmails(results, host), website: `https://${host}` };
}
