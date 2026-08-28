import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as cheerio from "cheerio";

export type LinkedInEmailJob = {
  title: string;
  company: string | null;
  url: string;
};

const MAX_JOBS = 5;
// Collect more candidates than we need, since some will get dropped by the
// freshness check below.
const MAX_CANDIDATES = 15;
// LinkedIn sends job-alert digests from a few different addresses depending
// on the alert type (saved search, "jobs for you", single-posting alert) —
// verified live against the real inbox rather than assumed.
const SENDERS = [
  "jobalerts-noreply@linkedin.com",
  "jobs-noreply@linkedin.com",
  "jobs-listings@linkedin.com",
];
// How far back to look for alert emails — wide enough to catch a day's
// digest even across a slow mail day, narrow enough to stay "recent".
const LOOKBACK_DAYS = 3;
const MAX_EMAILS_TO_SCAN = 10;
// Reject postings older than this — LinkedIn's alert emails can include
// jobs the platform itself surfaced days ago but that have since filled;
// this is a machine-checked freshness signal, not the model's judgment.
const MAX_POSTING_AGE_DAYS = 14;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function extractJobsFromHtml(html: string): LinkedInEmailJob[] {
  const $ = cheerio.load(html);
  const jobs = new Map<string, LinkedInEmailJob>();

  // LinkedIn's job-card links carry a `jobcard_body` marker in their
  // tracking params and wrap just the bolded job title text — verified
  // against real alert emails rather than guessed from the markup.
  $('a[href*="jobcard_body"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const jobIdMatch = href.match(/jobs\/view\/(\d+)/);
    if (!jobIdMatch) return;
    const jobId = jobIdMatch[1];
    if (jobs.has(jobId)) return;

    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!title) return;

    const meta = $(el).closest("table").find("p").first().text().replace(/\s+/g, " ").trim();
    const company = meta.split("·")[0]?.trim() || null;

    jobs.set(jobId, {
      title,
      company,
      url: `https://www.linkedin.com/jobs/view/${jobId}/`,
    });
  });

  return [...jobs.values()];
}

// Parses LinkedIn's own "posted-time-ago__text" field from the job's public
// page (e.g. "3 days ago", "2 weeks ago", "1 year ago") — confirmed live
// against both a fresh and a year-old posting. Anthropic's web_fetch tool
// can't reach these pages at all (LinkedIn returns url_not_allowed for it
// specifically), but a plain fetch with a normal browser User-Agent works.
async function isRecentPosting(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      redirect: "follow",
    });
    if (!res.ok) return false;

    const html = await res.text();
    const match = html.match(/posted-time-ago__text[^>]*>\s*([\s\S]*?)\s*<\/span>/);
    if (!match) return false;

    const postedText = match[1].trim().toLowerCase();
    if (/^\d+\s*hours?\s*ago$/.test(postedText)) return true;
    const daysMatch = postedText.match(/^(\d+)\s*days?\s*ago$/);
    if (daysMatch) return Number(daysMatch[1]) <= MAX_POSTING_AGE_DAYS;
    const weeksMatch = postedText.match(/^(\d+)\s*weeks?\s*ago$/);
    if (weeksMatch) return Number(weeksMatch[1]) * 7 <= MAX_POSTING_AGE_DAYS;

    // "X months ago", "X years ago", or anything unparseable — treat as
    // stale/unverifiable rather than risk showing an expired listing.
    return false;
  } catch (error) {
    console.error(`Failed to check freshness for ${url}:`, error);
    return false;
  }
}

// Pulls real, current job postings straight from LinkedIn's own alert
// emails — the platform blocks the AI web-search tool from fetching its job
// pages, so an AI-driven search can never verify a LinkedIn listing is
// genuine and current. Reading what LinkedIn itself already sent sidesteps
// the fabrication problem entirely; the freshness check above then filters
// out postings LinkedIn's own alerts included but that are likely stale.
export async function fetchLinkedInEmailJobs(): Promise<LinkedInEmailJob[]> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.error("Missing GMAIL_USER/GMAIL_APP_PASSWORD env vars — can't read job alert emails.");
    return [];
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass: pass.replace(/\s+/g, "") },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    let candidates: LinkedInEmailJob[];
    try {
      const since = new Date();
      since.setDate(since.getDate() - LOOKBACK_DAYS);

      const uids: number[] = [];
      for (const sender of SENDERS) {
        const found = await client.search({ from: sender, since }, { uid: true });
        if (found) uids.push(...found);
      }

      // Newest first, capped — we only need enough recent digests to fill
      // MAX_CANDIDATES, not every alert email in the lookback window.
      const recentUids = [...new Set(uids)].sort((a, b) => b - a).slice(0, MAX_EMAILS_TO_SCAN);

      const jobs = new Map<string, LinkedInEmailJob>();
      for (const uid of recentUids) {
        if (jobs.size >= MAX_CANDIDATES) break;

        const { content } = await client.download(uid, undefined, { uid: true });
        const chunks: Buffer[] = [];
        for await (const chunk of content) chunks.push(chunk as Buffer);
        const parsed = await simpleParser(Buffer.concat(chunks));
        if (!parsed.html) continue;

        for (const job of extractJobsFromHtml(parsed.html)) {
          if (!jobs.has(job.url)) jobs.set(job.url, job);
        }
      }

      candidates = [...jobs.values()].slice(0, MAX_CANDIDATES);
    } finally {
      lock.release();
    }

    // Check freshness in parallel — sequential checks against up to
    // MAX_CANDIDATES live LinkedIn pages was slow enough to time out.
    const freshChecks = await Promise.all(
      candidates.map(async (job) => ({ job, isFresh: await isRecentPosting(job.url) }))
    );
    const fresh = freshChecks
      .filter((result) => result.isFresh)
      .map((result) => result.job)
      .slice(0, MAX_JOBS);

    return fresh;
  } catch (error) {
    console.error("Failed to read LinkedIn job alert emails:", error);
    return [];
  } finally {
    await client.logout().catch(() => {});
  }
}
