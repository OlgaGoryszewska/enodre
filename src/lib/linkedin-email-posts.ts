import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as cheerio from "cheerio";

// Hiring posts from LinkedIn's "X and Y are hiring" emails in Gmail: people in
// your network posting that they need someone. They have no job page, so the
// link goes to the post itself.

export type LinkedInHiringPost = { id: string; author: string; text: string; url: string };

const SENDER = "messages-noreply@linkedin.com";
const LOOKBACK_DAYS = 14;
const MAX_EMAILS = 10;

// NFKC turns LinkedIn's decorative bold letters (𝗛𝗶𝗿𝗶𝗻𝗴) back into plain text.
const clean = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();

/** One post per link: the author from the named link, the text from its block in the email. */
export function extractHiringPosts(html: string) {
  const $ = cheerio.load(html);
  const posts = new Map<string, LinkedInHiringPost>();
  $('a[href*="feed/update"]').each((_, element) => {
    const href = decodeURIComponent($(element).attr("href") ?? "");
    const id = href.match(/urn:li:(?:activity|ugcPost|share):(\d+)/)?.[1];
    if (!id) return;
    const post = posts.get(id) ?? {
      id,
      author: "",
      text: "",
      url: `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`,
    };
    const label = clean($(element).text());
    if (label && !/^see post$/i.test(label) && !post.author) post.author = label;
    const block = clean($(element).closest("table").text());
    if (block.length > post.text.length) post.text = block.slice(0, 1200);
    posts.set(id, post);
  });
  // The text is what they wrote: not their own headline, not the button.
  return [...posts.values()].map((post) => ({
    ...post,
    text: clean(post.text.replace(post.author, "").replace(/see post/gi, "")),
  }));
}

export async function fetchLinkedInHiringPosts(): Promise<LinkedInHiringPost[]> {
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
  const posts = new Map<string, LinkedInHiringPost>();
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
      const uids = (await client.search({ from: SENDER, subject: "hiring", since }, { uid: true })) || [];
      for (const uid of [...uids].sort((a, b) => b - a).slice(0, MAX_EMAILS)) {
        const { content } = await client.download(String(uid), undefined, { uid: true });
        const chunks: Buffer[] = [];
        for await (const chunk of content) chunks.push(chunk as Buffer);
        const parsed = await simpleParser(Buffer.concat(chunks));
        if (!parsed.html) continue;
        for (const post of extractHiringPosts(parsed.html)) if (!posts.has(post.id)) posts.set(post.id, post);
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("Failed to read LinkedIn hiring posts:", error);
    return [];
  } finally {
    await client.logout().catch(() => {});
  }
  return [...posts.values()];
}
