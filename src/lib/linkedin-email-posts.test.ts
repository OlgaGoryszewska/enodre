import { test } from "node:test";
import assert from "node:assert/strict";
import { extractHiringPosts } from "./linkedin-email-posts.ts";

test("reads hiring posts from a LinkedIn email, one per post", () => {
  const html = `<table><tr><td>
    <a href="https://www.linkedin.com/comm/feed/update/urn%3Ali%3Aactivity%3A7391?trk=x">Erika Mckenzie Konsulentleder @Webstep</a>
    <p>Vi søker en frontend-utvikler med React til et prosjekt i Oslo.</p>
    <a href="https://www.linkedin.com/comm/feed/update/urn%3Ali%3Aactivity%3A7391?trk=y">See post</a>
  </td></tr></table>`;
  const posts = extractHiringPosts(html);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].author, "Erika Mckenzie Konsulentleder @Webstep");
  assert.ok(posts[0].text.includes("frontend-utvikler"));
  assert.ok(!posts[0].text.includes("Webstep"));
  assert.equal(posts[0].url, "https://www.linkedin.com/feed/update/urn:li:activity:7391/");
});

test("decorative LinkedIn letters become plain text", () => {
  const html = `<table><tr><td><a href="https://www.linkedin.com/feed/update/urn:li:activity:1">Ann</a> 𝗛𝗶𝗿𝗶𝗻𝗴 𝗠𝗶𝗱-𝗹𝗲𝘃𝗲𝗹 𝗦𝗼𝗳𝘁𝘄𝗮𝗿𝗲 𝗘𝗻𝗴𝗶𝗻𝗲𝗲𝗿</td></tr></table>`;
  assert.equal(extractHiringPosts(html)[0].text, "Hiring Mid-level Software Engineer");
});
