// Details for job application forms — the fixed ones come from the CV; the
// answers that change per situation (notice period, salary …) are saved in
// job_profile and edited on Find jobs.

// A letter written by hand, to copy and adapt: the style to aim for.
export const EXAMPLE_COVER_LETTER = `Olga Goryszewska
Phone/WhatsApp: +47 483 38 779 | olga.goryszewska@gmail.com | behance.net/olgagoryszewska | github.com/OlgaGoryszewska

Re: Web & Brand Designer, viktor.com

Hi Viktor team,

I'll be honest: I read "taste at speed" and smiled, because that's pretty much how I've been working for the last few years. Lots of pages, not much time, and a real wish to make every one of them look and feel right.

I've never been able to pick between design and code, so I do both. I studied UX Design and Frontend Development at Noroff, and these days I usually go from a sketch in Figma to a live page in Next.js, React and Tailwind myself, with Claude Code open next to me the whole time. I use AI for almost everything: first ideas, copy drafts, imagery and the code itself.

The project I'd love to show you first is nickwhittakerimagery.com. Nick is an ocean photographer in Auckland, and I helped him figure out what his brand should be, then built it into a site where his photos do the talking: collections, a print shop and a trade program for interior designers. It's the opposite of grey SaaS, and I'm proud of it. I've also built salonbialylotos.pl for a beauty salon in Poland and ceylonshouse.com for a small hotel in Sri Lanka. They're all live, with real people using them.

Pretty isn't enough for me, though. When I built FuelFlo, a platform for fuel technicians who often work with no signal, the whole point was that someone in a hurry could log a delivery in seconds. That's the kind of thinking I'd bring to your signup and pricing pages.

If I joined, I'd want to get one page live in the new identity quickly, then build simple templates so the next pages come faster. I'd rather ship, look at what people actually do, and improve it than polish something in private for weeks. I haven't run big A/B testing programs yet, and I'd really like to learn that from your team.

Something you might not expect: before tech, I ran my own client business for 13 years and talked to customers every single day. I love people, and I'm not shy about asking users what's confusing them. So talking to users on my first day sounds great to me.

Outside work you'll find me at yoga, lifting weights, hiking (a habit from my years in Norway), or out walking my two Labradoodles. I've moved around a lot, and now I'm settling in Warsaw from December. I'm ready to stay put and grow with one team, and working from your Warsaw office would be perfect.

Thanks for reading this far. I'd love to show you the live work and hear where you want viktor.com to go.

Warm regards,
Olga Goryszewska`;

export const FIXED_DETAILS: { label: string; value: string }[] = [
  { label: "First name", value: "Olga" },
  { label: "Last name", value: "Goryszewska" },
  { label: "Email", value: "olga.goryszewska@gmail.com" },
  { label: "Phone", value: "+47 483 38 779" },
  { label: "City", value: "Bergen, Norway" },
  { label: "LinkedIn", value: "https://www.linkedin.com/in/olga-goryszewska" },
  { label: "GitHub", value: "https://github.com/OlgaGoryszewska" },
  { label: "Portfolio", value: "https://enodre.com" },
  { label: "Behance", value: "https://www.behance.net/olgagoryszewska" },
  { label: "Current title", value: "Full Stack Developer & Product Engineer" },
  { label: "Years of experience", value: "3 (hands-on projects: freelance and sole builder of FuelFlo)" },
  { label: "Languages", value: "Polish (native), English (fluent), Norwegian (fluent), German (elementary)" },
  {
    label: "Education",
    value:
      "Bachelor's degree in Public Health, specialising in cosmetology and wellness; Frontend Development (Noroff, 2022–2024, grade A); UX Design (Noroff, 2021–2022, grade A)",
  },
  {
    label: "Clinic background",
    value:
      "13 years owning and running a medical micropigmentation clinic, collaborating with medical and aesthetic clinics",
  },
  {
    label: "Key skills",
    value:
      "React, Next.js, TypeScript, React Native, Expo, Node.js, Supabase, PostgreSQL, REST APIs, Tailwind CSS, Figma, UX research",
  },
];

// Not in the CV — yours to fill in once; empty until you do.
export const PROFILE_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "notice_period", label: "Notice period / start date", hint: "e.g. Available from 1 December 2026" },
  { key: "salary_norway", label: "Salary expectation (Norway)", hint: "e.g. NOK 650 000–720 000 a year" },
  { key: "salary_abroad", label: "Salary expectation (abroad)", hint: "e.g. EUR / PLN / AED / SAR, per year or month" },
  {
    key: "work_permit",
    label: "Work permit / citizenship",
    hint: "Your right to work in Norway, the EU, UAE, Saudi Arabia",
  },
  { key: "relocation", label: "Willing to relocate?", hint: "Which cities, and from when" },
  { key: "remote", label: "Remote / hybrid preference", hint: "e.g. Remote or hybrid; on-site in Oslo possible" },
  {
    key: "why_me",
    label: "Short pitch (“Why are you a good fit?”)",
    hint: "Two or three sentences you can paste into free-text questions",
  },
];

export type JobProfile = Record<string, string>;
