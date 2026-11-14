import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGmailMailer } from "@/lib/mailer";
import { findNavBeautyJobs } from "@/lib/nav-jobs";
import {
  SCOUT_CITIES,
  SCOUT_TREATMENTS,
  brandKey,
  extractAlertLinks,
  mentionsPmu,
  parseFreshaListing,
  parseFreshaVenue,
  placeKind,
  placeValue,
  scorePmuAd,
  whatsappNumber,
  type FreshaVenue,
  type ScoutCity,
} from "@/lib/pmu-scout";

// Server-only. The PMU agent's daily search: new places that offer PMU (from
// Fresha's public city pages), and PMU job ads (NAV, your Gmail job alerts,
// careers pages). Nothing is sent: places and ads land on the PMU jobs page.

export const PMU_AGENT = {
  /** New places added per run, best value first. */
  placesPerRun: 10,
  /** Venue pages read per run to judge value (one request each). */
  venuesChecked: 30,
  navDays: 7,
  alertDays: 3,
  timeBudgetMs: 200_000,
};

// Job boards whose alert emails can carry PMU jobs. Set the alerts up once on
// each site, sent to your Gmail.
const ALERT_SENDERS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "jooble.org",
  "infojobs.net",
  "infoempleo.com",
  "net-empregos.com",
  "sapo.pt",
  "itjobs.pt",
  "finn.no",
  "spastaff.com",
];

// Careers pages checked on every run for new PMU roles.
const CAREERS_PAGES: { company: string; location: string; url: string }[] = [
  {
    company: "SHA Wellness Clinic",
    location: "El Albir",
    url: "https://shawellness.com/careers/en/job-opportunities/",
  },
];

const USER_AGENT = "Mozilla/5.0 (compatible; personal job search; olga.goryszewska@gmail.com)";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
  return response.text();
}

export type PmuRunStats = {
  places: { name: string; city: string; value: number; reasons: string[] }[];
  ads: { title: string; company: string | null; source: string; score: number; url: string }[];
  skippedAds: number;
  checkedVenues: number;
  problems: string[];
};

type NewPlace = {
  kind: "clinic" | "studio" | "salon";
  name: string;
  city: string;
  country: string;
  website: string | null;
  instagram: string | null;
  whatsapp: string | null;
  services: string | null;
  pay_score: number;
  pay_note: string;
  fit: "high" | "medium";
  source: "fresha";
  source_url: string;
  fresha_url: string;
  reviews: number;
  team_size: number | null;
  discovered_at: string;
  notes: string | null;
};

type NewAd = {
  source: "nav" | "alert" | "careers";
  external_id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  snippet: string | null;
  score: number;
  matched: string[];
};

async function findPlaces(
  known: { names: Set<string>; urls: Set<string> },
  stats: PmuRunStats,
  timeLeft: () => boolean
): Promise<NewPlace[]> {
  const candidates: { city: ScoutCity; venue: FreshaVenue }[] = [];
  const seen = new Set<string>();
  for (const city of SCOUT_CITIES) {
    for (const treatment of SCOUT_TREATMENTS) {
      if (!timeLeft()) break;
      try {
        const venues = parseFreshaListing(
          await fetchText(`https://www.fresha.com/lp/en/tt/${treatment}/in/${city.slug}`)
        );
        for (const venue of venues) {
          const brand = `${brandKey(venue.name)}|${city.city}`;
          // Branches of one chain share a website or an Instagram account.
          const site = venue.website ? `site:${venue.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}` : null;
          const insta = venue.instagram ? `ig:${venue.instagram.toLowerCase()}` : null;
          const keys = [brand, site, insta].filter((key): key is string => Boolean(key));
          if (known.urls.has(venue.url) || known.names.has(brand) || keys.some((key) => seen.has(key))) continue;
          for (const key of keys) seen.add(key);
          candidates.push({ city, venue });
        }
      } catch (error) {
        // Not every city has a page for every treatment.
        const message = error instanceof Error ? error.message : "failed";
        if (!message.startsWith("404")) stats.problems.push(`Fresha ${city.city}: ${message}`);
      }
      await pause(400);
    }
  }

  // Busiest first within each market, best markets first: those are read in full.
  // An even spread: the busiest few in every city, so no single city crowds out the rest.
  const perCity = Math.max(1, Math.ceil(PMU_AGENT.venuesChecked / SCOUT_CITIES.length));
  const shortlist = SCOUT_CITIES.flatMap((city) =>
    candidates
      .filter((candidate) => candidate.city.slug === city.slug)
      .sort((a, b) => b.venue.reviews - a.venue.reviews)
      .slice(0, perCity)
  );
  const judged: (NewPlace & { order: number })[] = [];
  for (const { city, venue } of shortlist) {
    if (!timeLeft()) break;
    const details = await fetchText(venue.url)
      .then(parseFreshaVenue)
      .catch(() => null);
    stats.checkedVenues++;
    const value = placeValue(city, venue, details);
    const name = venue.name.split(/\s[|]\s/)[0].trim();
    judged.push({
      kind: placeKind(venue.name),
      name,
      city: city.city,
      country: city.country,
      website: venue.website,
      instagram: venue.instagram,
      whatsapp: whatsappNumber(details?.phone ?? null),
      services: details?.pmuServices.length
        ? `${details.pmuServices.join(", ")}${details.pmuPrice ? ` (up to ${city.currency} ${Math.round(details.pmuPrice)})` : ""}`
        : venue.street,
      pay_score: value.score,
      pay_note: value.reasons.join("; ") || "Found on Fresha",
      fit: value.score >= 4 ? "high" : "medium",
      source: "fresha",
      source_url: venue.url,
      fresha_url: venue.url,
      reviews: venue.reviews,
      team_size: details?.teamSize ?? null,
      discovered_at: new Date().toISOString(),
      notes: [
        venue.rating ? `Rated ${venue.rating} from ${venue.reviews} reviews.` : null,
        details?.phone && !whatsappNumber(details.phone) ? `Phone ${details.phone}.` : null,
        venue.street,
      ]
        .filter(Boolean)
        .join(" "),
      order: value.score * 100_000 + Math.min(venue.reviews, 99_999),
    });
    await pause(300);
  }
  return judged
    .sort((a, b) => b.order - a.order)
    .slice(0, PMU_AGENT.placesPerRun)
    .map(({ order: _order, ...place }) => {
      void _order;
      return place;
    });
}

async function adsFromNav(): Promise<NewAd[]> {
  const jobs = await findNavBeautyJobs(PMU_AGENT.navDays, mentionsPmu);
  return jobs.map((job) => {
    const verdict = scorePmuAd(job.title, job.description);
    return {
      source: "nav",
      external_id: job.id,
      title: job.title,
      company: job.company,
      location: job.location || "Norway",
      url: job.url,
      snippet: job.description
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 500),
      score: verdict.score,
      matched: verdict.matched,
    };
  });
}

async function adsFromAlerts(): Promise<NewAd[]> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD aren't set.");
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass: pass.replace(/\s+/g, "") },
    logger: false,
  });
  const ads: NewAd[] = [];
  await client.connect();
  const allMail = (await client.list()).find((box) => box.specialUse === "\\All")?.path ?? "INBOX";
  const lock = await client.getMailboxLock(allMail);
  try {
    const uids =
      (await client.search(
        { gmraw: `from:(${ALERT_SENDERS.join(" OR ")}) newer_than:${PMU_AGENT.alertDays}d` },
        { uid: true }
      )) || [];
    const newest = [...uids].sort((a, b) => b - a).slice(0, 60);
    if (newest.length === 0) return [];
    for await (const message of client.fetch(newest, { uid: true, source: { maxLength: 400_000 } }, { uid: true })) {
      if (!message.source) continue;
      const parsed = await simpleParser(message.source);
      const sender = parsed.from?.value?.[0]?.address?.split("@")[1] ?? "alert";
      for (const link of extractAlertLinks(typeof parsed.html === "string" ? parsed.html : "")) {
        const verdict = scorePmuAd(link.title, "");
        ads.push({
          source: "alert",
          // Alert links carry tracking; the job's own path is the stable part.
          external_id: link.url.replace(/[?#].*$/, ""),
          title: link.title,
          company: null,
          location: sender,
          url: link.url,
          snippet: parsed.subject ?? null,
          score: verdict.score,
          matched: verdict.matched,
        });
      }
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
  return ads;
}

async function adsFromCareersPages(stats: PmuRunStats): Promise<NewAd[]> {
  const ads: NewAd[] = [];
  for (const page of CAREERS_PAGES) {
    try {
      for (const link of extractAlertLinks(await fetchText(page.url))) {
        const url = new URL(link.url, page.url).toString();
        const verdict = scorePmuAd(link.title, "");
        ads.push({
          source: "careers",
          external_id: url.replace(/[?#].*$/, ""),
          title: link.title,
          company: page.company,
          location: page.location,
          url,
          snippet: null,
          score: verdict.score,
          matched: verdict.matched,
        });
      }
    } catch (error) {
      stats.problems.push(`${page.company} careers page: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return ads;
}

export function buildPmuReport(stats: PmuRunStats, preview = false) {
  const lines = [
    preview ? "PMU agent preview — nothing was saved." : "PMU agent report",
    "",
    `New places: ${stats.places.length} (from ${stats.checkedVenues} checked on Fresha)`,
    ...stats.places.map(
      (place) =>
        `- ${place.name}, ${place.city} · pay ${place.value}/5${place.reasons.length ? ` · ${place.reasons.join("; ")}` : ""}`
    ),
    "",
    `New PMU job ads: ${stats.ads.length}${stats.skippedAds ? ` (${stats.skippedAds} skipped for red flags)` : ""}`,
    ...stats.ads.map(
      (ad) => `- [${ad.score}] ${ad.title}${ad.company ? `, ${ad.company}` : ""} (${ad.source})\n  ${ad.url}`
    ),
  ];
  if (stats.problems.length) lines.push("", "Problems:", ...stats.problems.map((problem) => `- ${problem}`));
  return lines.join("\n");
}

/** One run: find, judge and save new places and ads, then report. */
export async function runPmuAgent(
  supabase: SupabaseClient,
  trigger: "cron" | "manual",
  options: { dryRun?: boolean } = {}
) {
  const dryRun = options.dryRun ?? false;
  const started = Date.now();
  const timeLeft = () => Date.now() - started < PMU_AGENT.timeBudgetMs;
  const stats: PmuRunStats = { places: [], ads: [], skippedAds: 0, checkedVenues: 0, problems: [] };

  const [targets, postings] = await Promise.all([
    supabase.from("pmu_targets").select("name, city, fresha_url"),
    supabase.from("pmu_postings").select("source, external_id"),
  ]);
  if (targets.error) throw new Error("Run supabase/pmu_agent.sql first.");
  const known = {
    names: new Set((targets.data ?? []).map((row) => `${brandKey(row.name)}|${row.city}`)),
    urls: new Set((targets.data ?? []).map((row) => row.fresha_url).filter(Boolean) as string[]),
  };
  const knownAds = new Set((postings.data ?? []).map((row) => `${row.source}|${row.external_id}`));

  // Places and ads in parallel: they use different sites.
  const [places, ...adLists] = await Promise.all([
    findPlaces(known, stats, timeLeft).catch((error) => {
      stats.problems.push(`Places: ${error instanceof Error ? error.message : "failed"}`);
      return [] as NewPlace[];
    }),
    adsFromNav().catch((error) => {
      stats.problems.push(`NAV: ${error instanceof Error ? error.message : "failed"}`);
      return [] as NewAd[];
    }),
    adsFromAlerts().catch((error) => {
      stats.problems.push(`Gmail alerts: ${error instanceof Error ? error.message : "failed"}`);
      return [] as NewAd[];
    }),
    adsFromCareersPages(stats),
  ]);

  const ads = new Map<string, NewAd>();
  for (const ad of adLists.flat()) {
    const key = `${ad.source}|${ad.external_id}`;
    if (knownAds.has(key) || ads.has(key)) continue;
    const verdict = scorePmuAd(ad.title, ad.snippet ?? "");
    if (!verdict.keep) {
      if (verdict.redFlags.length) stats.skippedAds++;
      continue;
    }
    ads.set(key, ad);
  }

  if (!dryRun && places.length) {
    const { error } = await supabase
      .from("pmu_targets")
      .upsert(places, { onConflict: "name,city", ignoreDuplicates: true });
    if (error) stats.problems.push(`Saving places: ${error.message}`);
  }
  if (!dryRun && ads.size) {
    const { error } = await supabase
      .from("pmu_postings")
      .upsert([...ads.values()], { onConflict: "source,external_id", ignoreDuplicates: true });
    if (error) stats.problems.push(`Saving ads: ${error.message}`);
  }

  stats.places = places.map((place) => ({
    name: place.name,
    city: place.city,
    value: place.pay_score,
    reasons: place.pay_note.split("; ").filter((reason) => reason !== "Found on Fresha"),
  }));
  stats.ads = [...ads.values()]
    .sort((a, b) => b.score - a.score)
    .map((ad) => ({ title: ad.title, company: ad.company, source: ad.source, score: ad.score, url: ad.url }));

  const report = buildPmuReport(stats, dryRun);
  if (dryRun) return { stats, report };

  await supabase.from("pmu_runs").insert({ trigger, stats, report });
  const mailer = getGmailMailer();
  if (mailer && (stats.places.length || stats.ads.length || stats.problems.length)) {
    await mailer.transporter
      .sendMail({
        from: `"PMU agent" <${mailer.address}>`,
        to: process.env.JOB_AGENT_REPORT_TO || mailer.address,
        subject: `PMU agent: ${stats.places.length} new places, ${stats.ads.length} new job ads`,
        text: report,
      })
      .catch((error) => console.error("PMU agent report email failed:", error));
  }
  return { stats, report };
}
