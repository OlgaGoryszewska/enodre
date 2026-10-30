// Details for job application forms — the fixed ones come from the CV; the
// answers that change per situation (notice period, salary …) are saved in
// job_profile and edited on Find jobs.

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
  { label: "Years of experience", value: "3+" },
  { label: "Languages", value: "Polish (native), English (fluent), Norwegian (fluent), German (elementary)" },
  {
    label: "Education",
    value: "Frontend Development (Noroff, 2022–2024, grade A); UX Design (Noroff, 2021–2022, grade A)",
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
