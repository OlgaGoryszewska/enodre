import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as cheerio from "cheerio";

export type LinkedInEmailJob = {
  title: string;
  company: string | null;
  location: string | null;
  url: string;
};

const MAX_JOBS = 5;
const MAX_CANDIDATES = 15;
// LinkedIn sends job-alert digests from a few different addresses depending
// on the alert type (saved search, "jobs for you", single-posting alert) —
// verified live against the real inbox rather than assumed.
const SENDERS = ["jobalerts-noreply@linkedin.com", "jobs-noreply@linkedin.com", "jobs-listings@linkedin.com"];
// How far back to look for alert emails — wide enough to catch a day's
// digest even across a slow mail day, narrow enough to stay "recent".
const LOOKBACK_DAYS = 7;
const MAX_EMAILS_TO_SCAN = 40;

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
    const [companyPart, locationPart] = meta.split("·");
    const company = companyPart?.trim() || null;

    jobs.set(jobId, {
      title,
      company,
      location: locationPart?.trim() || null,
      url: `https://www.linkedin.com/jobs/view/${jobId}/`,
    });
  });

  return [...jobs.values()];
}

// Job postings from the alert emails LinkedIn sends you — Gmail only. LinkedIn
// itself is never contacted; the email lookback window keeps them recent.
export async function fetchLinkedInEmailJobs(options: { maxJobs?: number } = {}): Promise<LinkedInEmailJob[]> {
  const maxJobs = options.maxJobs ?? MAX_JOBS;
  const maxCandidates = Math.max(MAX_CANDIDATES, maxJobs);
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
        if (jobs.size >= maxCandidates) break;

        const { content } = await client.download(uid, undefined, { uid: true });
        const chunks: Buffer[] = [];
        for await (const chunk of content) chunks.push(chunk as Buffer);
        const parsed = await simpleParser(Buffer.concat(chunks));
        if (!parsed.html) continue;

        for (const job of extractJobsFromHtml(parsed.html)) {
          if (!jobs.has(job.url)) jobs.set(job.url, job);
        }
      }

      candidates = [...jobs.values()].slice(0, maxCandidates);
    } finally {
      lock.release();
    }

    return candidates.slice(0, maxJobs);
  } catch (error) {
    console.error("Failed to read LinkedIn job alert emails:", error);
    return [];
  } finally {
    await client.logout().catch(() => {});
  }
}
