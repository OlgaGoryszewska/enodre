// NAV's job vacancy feed (arbeidsplassen.no) — free, every ad carries the
// employer's org number. Used to find companies that are hiring developers or
// designers right now: a sign they may need extra hands.
// Docs: https://navikt.github.io/pam-stilling-feed/
//
// Auth: NAV publishes a public token for experiments (it rotates, so it's
// fetched per run). For regular use, register for a private one (free, by
// email to nav.team.arbeidsplassen@nav.no) and set NAV_FEED_TOKEN.
// Finn.no ads aren't in the feed.

const BASE_URL = "https://pam-stilling-feed.nav.no";
// A month of feed is ~60 pages; stop well before anything runaway.
const MAX_PAGES = 150;
const DETAIL_CONCURRENCY = 8;

// STYRK-08 occupations that are our kind of work.
const STYRK_CODES = new Set([
  "2511", // systems analysts / architects
  "2512", // software developers
  "2513", // web and multimedia developers
  "2514", // application programmers
  "2519", // other software and application developers
  "2166", // graphic and multimedia designers
]);
// Cheap title prefilter before fetching each ad's details.
const TITLE_HINT =
  /(utvikler|developer|engineer|ingeni|frontend|backend|fullstack|full-stack|\bux\b|\bui\b|designer|designar|programm|software|tjenestedesign|produktdesign)/i;
// Design roles the STYRK coding often misses.
const DESIGN_TITLE = /(\bux\b|tjenestedesign|produktdesign|interaksjonsdesign|product designer|service designer)/i;

export type HiringAd = {
  title: string;
  url: string;
  published: string | null;
  engagement: string | null; // Fast, Prosjekt, Engasjement, Vikariat, ...
  employerOrgNumber: string;
  employerName: string;
  /** The employer's website as given in the ad — often missing from the register. */
  employerHomepage: string | null;
};

type FeedItem = { url: string; title: string; _feed_entry: { uuid: string; status: string } };
type FeedPage = { items: FeedItem[]; next_url: string | null };
type AdContent = {
  uuid: string;
  title: string;
  description?: string;
  published?: string;
  expires?: string;
  link?: string;
  applicationUrl?: string;
  sector?: string;
  engagementtype?: string;
  employer?: { name?: string; orgnr?: string; homepage?: string };
  workLocations?: {
    city?: string | null;
    municipal?: string | null;
    county?: string | null;
    country?: string | null;
  }[];
  categoryList?: { categoryType: string; code: string }[];
};
type AdDetail = { ad_content?: AdContent };

/** "https://treng.no/stilling-ledig/" -> "https://treng.no" (the site, not the jobs page). */
function homepageOf(url: string | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

async function feedToken() {
  if (process.env.NAV_FEED_TOKEN) return process.env.NAV_FEED_TOKEN;
  const response = await fetch(`${BASE_URL}/api/publicToken`, { cache: "no-store" });
  if (!response.ok) throw new Error(`NAV feed: couldn't get the public token (${response.status}).`);
  // "Current public token for Nav Job Vacancy Feed:\n<token>"
  const token = (await response.text()).split("\n")[1]?.trim();
  if (!token) throw new Error("NAV feed: the public token response changed format.");
  return token;
}

/** Every active ad for developers and designers changed in the last `days` days (full details). */
async function fetchDevAds(days: number): Promise<AdContent[]> {
  const token = await feedToken();
  const get = async <T>(path: string, headers: Record<string, string> = {}) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...headers },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`NAV feed ${response.status} for ${path}`);
    return (await response.json()) as T;
  };

  // The feed has one entry per change; the latest one per ad wins.
  const since = new Date(Date.now() - days * 86_400_000).toUTCString();
  const latest = new Map<string, FeedItem>();
  let page = await get<FeedPage>("/api/v1/feed", { "If-Modified-Since": since });
  for (let count = 1; ; count++) {
    for (const item of page.items) latest.set(item._feed_entry.uuid, item);
    if (!page.next_url || count >= MAX_PAGES) break;
    page = await get<FeedPage>(page.next_url);
  }
  const candidates = [...latest.values()].filter(
    (item) => item._feed_entry.status === "ACTIVE" && TITLE_HINT.test(item.title)
  );

  const ads: AdContent[] = [];
  for (let start = 0; start < candidates.length; start += DETAIL_CONCURRENCY) {
    const details = await Promise.all(
      candidates.slice(start, start + DETAIL_CONCURRENCY).map((item) => get<AdDetail>(item.url).catch(() => null))
    );
    for (const detail of details) {
      const ad = detail?.ad_content;
      if (!ad) continue;
      const styrk = (ad.categoryList ?? []).filter((c) => c.categoryType === "STYRK08").map((c) => c.code);
      if (!styrk.some((code) => STYRK_CODES.has(code)) && !DESIGN_TITLE.test(ad.title)) continue;
      ads.push(ad);
    }
  }
  return ads;
}

const adLink = (ad: AdContent) => ad.link ?? `https://arbeidsplassen.nav.no/stillinger/stilling/${ad.uuid}`;

/**
 * Active, private-sector ads for developers and designers, changed in the
 * last `days` days. Public employers are left out (they buy through tenders).
 */
export async function findHiringAds(days: number): Promise<HiringAd[]> {
  return (await fetchDevAds(days))
    .filter((ad) => ad.employer?.orgnr && ad.sector !== "Offentlig")
    .map((ad) => ({
      title: ad.title.trim(),
      url: adLink(ad),
      published: ad.published ?? null,
      engagement: ad.engagementtype ?? null,
      employerOrgNumber: ad.employer!.orgnr!,
      employerName: ad.employer?.name ?? "",
      employerHomepage: homepageOf(ad.employer?.homepage),
    }));
}

export type NavJob = {
  id: string;
  title: string;
  company: string | null;
  location: string;
  url: string;
  applicationUrl: string | null;
  description: string;
  published: string | null;
  expires: string | null;
};

/** Active developer/design jobs (public sector too — for the job agent), with location and text. */
export async function findNavJobs(days: number): Promise<NavJob[]> {
  return (await fetchDevAds(days)).map((ad) => ({
    id: ad.uuid,
    title: ad.title.trim(),
    company: ad.employer?.name ?? null,
    location: (ad.workLocations ?? [])
      .map((place) => [place.city, place.municipal, place.county].filter(Boolean).join(", "))
      .join("; "),
    url: adLink(ad),
    applicationUrl: ad.applicationUrl || null,
    description: ad.description ?? "",
    published: ad.published ?? null,
    expires: ad.expires ?? null,
  }));
}
