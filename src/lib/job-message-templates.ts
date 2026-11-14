import { adSubject, careerApplication, coverLetter, openApplication } from "./job-matching.ts";

// The messages the job agent and Recruiters & companies send, built by the same
// functions with sample details, so what you check here is what goes out.

export type MessageVersion = { language: string; subject: string; body: string };
export type MessageTemplate = { name: string; when: string; versions: MessageVersion[] };

const SAMPLE = { company: "[Company]", contact: "Anna Nowak" };

function introduction(contact: {
  kind: "agency" | "recruiter" | "company";
  name: string;
  industry?: string;
  specialisation?: string;
}): MessageVersion[] {
  return [
    { language: "English", ...careerApplication({ ...contact, coverage: "Europe" }) },
    { language: "Norwegian", ...careerApplication({ ...contact, coverage: "Norway" }) },
  ];
}

function application(title: string, matched: string[]): MessageVersion[] {
  return (["en", "no"] as const).map((language) => ({
    language: language === "en" ? "English" : "Norwegian",
    subject: adSubject(title, language),
    body: coverLetter({ title, company: SAMPLE.company, matched, language }),
  }));
}

export const RECRUITER_TEMPLATES: MessageTemplate[] = [
  {
    name: "Named recruiter",
    when: "A recruiter with a saved email. Sample first name: Anna.",
    versions: introduction({ kind: "recruiter", name: SAMPLE.contact }),
  },
  {
    name: "Recruitment agency",
    when: "An agency, to its general address.",
    versions: introduction({ kind: "agency", name: SAMPLE.company }),
  },
];

export const COMPANY_TEMPLATES: MessageTemplate[] = [
  {
    name: "HealthTech company",
    when: "The default for health companies.",
    versions: introduction({ kind: "company", name: SAMPLE.company }),
  },
  {
    name: "AI in healthcare",
    when: "A health company described as using AI.",
    versions: introduction({ kind: "company", name: SAMPLE.company, specialisation: "AI" }),
  },
  {
    name: "Medical devices and diagnostics",
    when: "A company working with devices, diagnostics, MRI or cardiac care.",
    versions: introduction({ kind: "company", name: SAMPLE.company, specialisation: "device" }),
  },
  {
    name: "Medical aesthetics",
    when: "A BeautyTech company working with clinics or aesthetics.",
    versions: introduction({ kind: "company", name: SAMPLE.company, industry: "BeautyTech", specialisation: "clinic" }),
  },
  {
    name: "Beauty",
    when: "Any other BeautyTech company.",
    versions: introduction({ kind: "company", name: SAMPLE.company, industry: "BeautyTech" }),
  },
];

export const JOB_TEMPLATES: MessageTemplate[] = [
  {
    name: "Developer job ad",
    when: "Emailed when an ad gives an address, and shown as the cover letter otherwise. The skills come from each ad.",
    versions: application("[Job title]", ["React", "Next.js", "TypeScript"]),
  },
  {
    name: "Design job ad",
    when: "The same letter for UX and product design titles.",
    versions: application("UX Designer", ["Figma", "UX"]),
  },
  {
    name: "Product, implementation or customer success ad",
    when: "Roles where the clinic background is the main story.",
    versions: application("Customer Success Manager", []),
  },
  {
    name: "Open application: software company",
    when: "Sent to Oslo companies that haven't advertised a role, at most 10 a day. Norwegian only.",
    versions: [{ language: "Norwegian", ...openApplication(SAMPLE.company, "62.100") }],
  },
  {
    name: "Open application: IT consultancy",
    when: "The same letter, opening for consultancies.",
    versions: [{ language: "Norwegian", ...openApplication(SAMPLE.company, "62.200") }],
  },
  {
    name: "Open application: agency",
    when: "The same letter, opening for advertising and digital agencies.",
    versions: [{ language: "Norwegian", ...openApplication(SAMPLE.company, "73.110") }],
  },
  {
    name: "Open application: design studio",
    when: "The same letter, opening for design studios.",
    versions: [{ language: "Norwegian", ...openApplication(SAMPLE.company, "74.120") }],
  },
];
