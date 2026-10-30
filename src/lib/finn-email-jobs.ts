import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as cheerio from "cheerio";

// FINN job ads, from FINN's own saved-search alert emails in Gmail. FINN has
// no public API and its terms don't allow scraping the site — but it emails
// you new ads for a saved search, and reading your own inbox is fine.
// Set up on finn.no: Jobb → search → "Lagre søk" → turn on e-postvarsel.

export type FinnEmailJob = { id: string; title: string; company: string | null; url: string };

const LOOKBACK_DAYS = 3;
const MAX_EMAILS = 15;
const MAX_REDIRECT_LOOKUPS = 40;

// finn.no/job/ad/123456789, finn.no/job/fulltime/ad.html?finnkode=123456789, finn.no/123456789
const AD_ID =
  /finn\.no\/(?:job\/(?:[a-z]+\/)?ad(?:\.html)?\?finnkode=|job\/ad\/|(?:[a-z]+\/)*ad\.html\?finnkode=|)(\d{8,10})\b/i;
// Link texts that aren't a job title.
const NOT_A_TITLE =
  /^(se annonsen|se annonse|vis annonse|les mer|se alle|se flere|åpne|finn\.no|lagrede søk|innstillinger|avslutt|meld deg av|unsubscribe)$/i;

/** Job ads in one FINN alert email: ad id, title (the link text) and the line under it. */
export function extractFinnJobs(html: string, resolve: (href: string) => string | null = (href) => href) {
  const $ = cheerio.load(html);
  const jobs = new Map<string, FinnEmailJob>();
  $("a[href]").each((_, element) => {
    const href = resolve($(element).attr("href") ?? "");
    const id = href?.match(AD_ID)?.[1];
    if (!id) return;
    const title = $(element).text().replace(/\s+/g, " ").trim();
    const current = jobs.get(id);
    // Several links per ad (image, title, button) — keep the one that reads like a title.
    if (!title || title.length < 4 || NOT_A_TITLE.test(title)) {
      if (!current) jobs.set(id, { id, title: "", company: null, url: `https://www.finn.no/job/ad/${id}` });
      return;
    }
    if (current?.title) return;
    const company =
      $(element).closest("td, div").find("p, span").not(element).first().text().replace(/\s+/g, " ").trim() || null;
    jobs.set(id, {
      id,
      title,
      company: company && company !== title ? company.slice(0, 120) : null,
      url: `https://www.finn.no/job/ad/${id}`,
    });
  });
  return [...jobs.values()].filter((job) => job.title);
}

/** Tracking links (click.… → finn.no) are followed one hop to find the ad they point at. */
async function followRedirect(href: string) {
  try {
    const response = await fetch(href, { redirect: "manual", signal: AbortSignal.timeout(6000) });
    return response.headers.get("location");
  } catch {
    return null;
  }
}

export async function fetchFinnEmailJobs(): Promise<FinnEmailJob[]> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return [];

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass: pass.replace(/\s+/g, "") },
    logger: false,
  });
  const htmls: string[] = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
      const uids = (await client.search({ from: "finn.no", since }, { uid: true })) || [];
      for (const uid of [...uids].sort((a, b) => b - a).slice(0, MAX_EMAILS)) {
        const { content } = await client.download(String(uid), undefined, { uid: true });
        const chunks: Buffer[] = [];
        for await (const chunk of content) chunks.push(chunk as Buffer);
        const parsed = await simpleParser(Buffer.concat(chunks));
        if (parsed.html) htmls.push(parsed.html);
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("Failed to read FINN alert emails:", error);
    return [];
  } finally {
    await client.logout().catch(() => {});
  }

  // Resolve tracking links up front (a few at a time), then parse.
  const tracked = new Set<string>();
  for (const html of htmls) {
    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1].replace(/&amp;/g, "&");
      if (!AD_ID.test(href) && /^https?:\/\//.test(href) && !/unsubscribe|avmeld/i.test(href)) tracked.add(href);
    }
  }
  const resolved = new Map<string, string | null>();
  const queue = [...tracked].slice(0, MAX_REDIRECT_LOOKUPS);
  for (let start = 0; start < queue.length; start += 8) {
    const batch = queue.slice(start, start + 8);
    const targets = await Promise.all(batch.map(followRedirect));
    batch.forEach((href, index) => resolved.set(href, targets[index]));
  }

  const jobs = new Map<string, FinnEmailJob>();
  for (const html of htmls) {
    for (const job of extractFinnJobs(html, (href) => (AD_ID.test(href) ? href : (resolved.get(href) ?? href)))) {
      if (!jobs.has(job.id)) jobs.set(job.id, job);
    }
  }
  return [...jobs.values()];
}
