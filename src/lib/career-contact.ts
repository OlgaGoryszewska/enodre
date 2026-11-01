// Recruiters & companies tracker (career_contacts.sql).

export const CAREER_KIND_VALUES = ["agency", "recruiter", "company"] as const;
export type CareerKind = (typeof CAREER_KIND_VALUES)[number];

export const CAREER_STATUS_VALUES = ["to_contact", "contacted", "replied", "interviewing", "not_relevant"] as const;
export type CareerStatus = (typeof CAREER_STATUS_VALUES)[number];

export const careerStatusLabels: Record<CareerStatus, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  replied: "Replied",
  interviewing: "Interviewing",
  not_relevant: "Not relevant",
};

export const careerKindLabels: Record<CareerKind, string> = {
  agency: "Agency",
  recruiter: "Recruiter",
  company: "Company",
};

export type CareerContact = {
  id: string;
  created_at: string;
  updated_at: string;
  kind: CareerKind;
  name: string;
  organisation: string | null;
  website: string | null;
  linkedin: string | null;
  coverage: string | null;
  specialisation: string | null;
  fit: "high" | "medium" | "low" | null;
  roles: string | null;
  industry: string | null;
  email: string | null;
  notes: string | null;
  status: CareerStatus;
  last_contacted_on: string | null;
};
