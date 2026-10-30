// Job agent sources — all free. Each returns ads in one shape; a source that
// isn't set up (no key) or fails is reported, not fatal.
//   Oslo     NAV job feed (no key)
//   Warsaw   Adzuna Poland (ADZUNA_APP_ID / ADZUNA_APP_KEY, free, instant) + Jooble
//   Dubai    Jooble UAE (JOOBLE_API_KEY, free on request)
//   Riyadh   Jooble Saudi Arabia
//   Spain    Adzuna Spain + Jooble Spain (the whole country)
//   Colombo  no job API covers Sri Lanka — LinkedIn job-alert emails + remote boards
//   Remote   Himalayas and Remotive (no key; Remotive asks for ≤ 4 calls a day)

import { findNavJobs } from "@/lib/nav-jobs";
import { fetchLinkedInEmailJobs } from "@/lib/linkedin-email-jobs";
import { fetchFinnEmailJobs } from "@/lib/finn-email-jobs";
import { cityOf, type TargetCity } from "@/lib/job-matching";

export type JobSource = "nav" | "adzuna" | "jooble" | "himalayas" | "remotive" | "linkedin" | "finn";

export type FoundJob = {
  source: JobSource;
  externalId: string;
  title: string;
  company: string | null;
  location: string;
  city: TargetCity | null;
  url: string;
  text: string;
  publishedAt: string | null;
};

export type SourceReport = { source: JobSource; found: number; error?: string; skipped?: string };

const KEYWORDS = ["react developer", "frontend developer", "full stack developer", "ux designer"];
const TIMEOUT_MS = 15_000;
// Remote ads must be open to someone living in one of the target countries.
const REMOTE_OK =
  /(spain|worldwide|anywhere|europe|emea|norway|poland|middle east|united arab emirates|uae|saudi|sri lanka|asia)/i;
const REMOTE_COUNTRIES = ["Norway", "Poland", "United Arab Emirates", "Saudi Arabia", "Sri Lanka", "Spain"];

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
  return (await response.json()) as T;
}

async function fromNav(days: number): Promise<FoundJob[]> {
  const jobs = await findNavJobs(days);
  return jobs
    .map((job) => ({
      source: "nav" as const,
      externalId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      city: cityOf(job.location),
      url: job.url,
      text: strip(job.description),
      publishedAt: job.published,
    }))
    .filter((job) => job.city === "Oslo" || job.city === "Remote");
}

type AdzunaResult = {
  id: string;
  title: string;
  description: string;
  created: string;
  redirect_url: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
};

async function fromAdzuna(days: number): Promise<FoundJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new SkipSource("No ADZUNA_APP_ID / ADZUNA_APP_KEY");
  // Warsaw, and all of Spain (no "where" = the whole country).
  const searches: { country: string; where: string | null; city: TargetCity }[] = [
    { country: "pl", where: "Warszawa", city: "Warsaw" },
    { country: "es", where: null, city: "Spain" },
  ];
  const lists = await Promise.all(
    searches.map(async (search) => {
      const query = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: "50",
        what_or: "react frontend javascript typescript fullstack next.js ux",
        max_days_old: String(days),
        "content-type": "application/json",
        ...(search.where ? { where: search.where } : {}),
      });
      const data = await getJson<{ results?: AdzunaResult[] }>(
        `https://api.adzuna.com/v1/api/jobs/${search.country}/search/1?${query}`
      );
      return (data.results ?? []).map((job) => ({
        source: "adzuna" as const,
        externalId: String(job.id),
        title: strip(job.title),
        company: job.company?.display_name ?? null,
        location: job.location?.display_name ?? search.where ?? search.city,
        city: search.city,
        url: job.redirect_url,
        text: strip(job.description),
        publishedAt: job.created ?? null,
      }));
    })
  );
  return lists.flat();
}

type JoobleJob = {
  id: number | string;
  title: string;
  location: string;
  snippet: string;
  link: string;
  company?: string;
  updated?: string;
};

async function fromJooble(): Promise<FoundJob[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) throw new SkipSource("No JOOBLE_API_KEY");
  const searches: { host: string; location: string; city: TargetCity }[] = [
    { host: "ae.jooble.org", location: "Dubai", city: "Dubai" },
    { host: "sa.jooble.org", location: "Riyadh", city: "Riyadh" },
    { host: "pl.jooble.org", location: "Warszawa", city: "Warsaw" },
    { host: "es.jooble.org", location: "España", city: "Spain" },
  ];
  const results = await Promise.allSettled(
    searches.flatMap((search) =>
      KEYWORDS.map(async (keywords) => {
        const data = await getJson<{ jobs?: JoobleJob[] }>(`https://${search.host}/api/${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords, location: search.location, page: "1" }),
        });
        return (data.jobs ?? []).map((job) => ({
          source: "jooble" as const,
          externalId: String(job.id),
          title: strip(job.title),
          company: job.company || null,
          location: job.location || search.location,
          city: search.city,
          url: job.link,
          text: strip(job.snippet ?? ""),
          publishedAt: job.updated ?? null,
        }));
      })
    )
  );
  const jobs = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  if (jobs.length === 0 && results.every((result) => result.status === "rejected")) {
    throw new Error((results[0] as PromiseRejectedResult).reason?.message ?? "Jooble failed");
  }
  return jobs;
}

type HimalayasJob = {
  guid: string;
  title: string;
  companyName?: string;
  excerpt?: string;
  description?: string;
  applicationLink?: string;
  pubDate?: string | number;
  locationRestrictions?: string[];
};

async function fromHimalayas(days: number): Promise<FoundJob[]> {
  const since = Date.now() - days * 86_400_000;
  const pages = await Promise.all(
    ["react", "next.js", "frontend", "full stack", "react native", "ux designer"]
      .flatMap((q) => [1, 2, 3].map((page) => ({ q, page })))
      .map(({ q, page }) =>
        getJson<{ jobs?: HimalayasJob[] }>(
          `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&page=${page}`
        ).catch(() => ({ jobs: [] as HimalayasJob[] }))
      )
  );
  return pages
    .flatMap((page) => page.jobs ?? [])
    .filter((job) => {
      const published = Number(job.pubDate) * 1000;
      const places = job.locationRestrictions ?? [];
      return (
        (!published || published >= since) && (places.length === 0 || places.some((p) => REMOTE_COUNTRIES.includes(p)))
      );
    })
    .map((job) => ({
      source: "himalayas" as const,
      externalId: job.guid,
      title: strip(job.title),
      company: job.companyName ?? null,
      location: (job.locationRestrictions ?? []).length
        ? `Remote (${job.locationRestrictions!.join(", ")})`
        : "Remote (worldwide)",
      city: "Remote" as const,
      url: job.applicationLink || job.guid,
      text: strip(`${job.excerpt ?? ""} ${job.description ?? ""}`).slice(0, 4000),
      publishedAt: job.pubDate ? new Date(Number(job.pubDate) * 1000).toISOString() : null,
    }));
}

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name?: string;
  candidate_required_location?: string;
  publication_date?: string;
  description?: string;
};

async function fromRemotive(days: number): Promise<FoundJob[]> {
  const since = Date.now() - days * 86_400_000;
  const lists = await Promise.all(
    ["software-dev", "design"].map((category) =>
      getJson<{ jobs?: RemotiveJob[] }>(`https://remotive.com/api/remote-jobs?category=${category}`)
    )
  );
  return lists
    .flatMap((list) => list.jobs ?? [])
    .filter(
      (job) =>
        REMOTE_OK.test(job.candidate_required_location ?? "") &&
        (!job.publication_date || new Date(job.publication_date).getTime() >= since)
    )
    .map((job) => ({
      source: "remotive" as const,
      externalId: String(job.id),
      title: strip(job.title),
      company: job.company_name ?? null,
      location: `Remote (${job.candidate_required_location})`,
      city: "Remote" as const,
      // Remotive's terms: link back to the job on Remotive.
      url: job.url,
      text: strip(job.description ?? "").slice(0, 4000),
      publishedAt: job.publication_date ?? null,
    }));
}

async function fromLinkedIn(): Promise<FoundJob[]> {
  // Your LinkedIn job alerts (set them up per city on LinkedIn) — read from Gmail.
  const jobs = await fetchLinkedInEmailJobs({ maxJobs: 40 });
  return jobs.map((job) => ({
    source: "linkedin" as const,
    externalId: job.url.match(/\/jobs\/view\/(\d+)/)?.[1] ?? job.url,
    title: job.title,
    company: job.company,
    location: "LinkedIn alert",
    city: null,
    url: job.url,
    text: "",
    publishedAt: null,
  }));
}

async function fromFinn(): Promise<FoundJob[]> {
  // FINN's saved-search alert emails (finn.no → Lagre søk → e-postvarsel) — read from Gmail.
  const jobs = await fetchFinnEmailJobs();
  return jobs.map((job) => ({
    source: "finn" as const,
    externalId: job.id,
    title: job.title,
    company: job.company,
    location: "FINN alert",
    city: cityOf(`${job.title} ${job.company ?? ""}`),
    url: job.url,
    text: job.company ?? "",
    publishedAt: null,
  }));
}

class SkipSource extends Error {}

/** Every source, side by side. Ads from the last `days` days where the source allows it. */
export async function collectJobs(days: number): Promise<{ jobs: FoundJob[]; reports: SourceReport[] }> {
  const sources: [JobSource, () => Promise<FoundJob[]>][] = [
    ["nav", () => fromNav(days)],
    ["adzuna", () => fromAdzuna(days)],
    ["jooble", () => fromJooble()],
    ["himalayas", () => fromHimalayas(days)],
    ["remotive", () => fromRemotive(days)],
    ["linkedin", () => fromLinkedIn()],
    ["finn", () => fromFinn()],
  ];
  const results = await Promise.allSettled(sources.map(([, run]) => run()));
  const reports: SourceReport[] = [];
  const jobs: FoundJob[] = [];
  results.forEach((result, index) => {
    const source = sources[index][0];
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
      reports.push({ source, found: result.value.length });
    } else if (result.reason instanceof SkipSource) {
      reports.push({ source, found: 0, skipped: result.reason.message });
    } else {
      reports.push({ source, found: 0, error: result.reason instanceof Error ? result.reason.message : "Failed" });
    }
  });
  return { jobs, reports };
}
