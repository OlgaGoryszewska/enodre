export const POTENTIAL_CUSTOMER_STATUS_VALUES = ["new", "contacted", "interested", "converted", "not_interested"] as const;

export type PotentialCustomerStatus = (typeof POTENTIAL_CUSTOMER_STATUS_VALUES)[number];

export const potentialCustomerStatusLabels: Record<PotentialCustomerStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  converted: "Converted",
  not_interested: "Not interested",
};

// Phase 2: once a lead responds, `attitude` tracks how they're coming
// across in the conversation — separate from `status`, which keeps tracking
// the overall pipeline stage.
export const POTENTIAL_CUSTOMER_ATTITUDE_VALUES = ["positive", "neutral", "negative"] as const;

export type PotentialCustomerAttitude = (typeof POTENTIAL_CUSTOMER_ATTITUDE_VALUES)[number];

export const potentialCustomerAttitudeLabels: Record<PotentialCustomerAttitude, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

// GTM fields — keep values in sync with the checks in supabase/potential_customers.sql.
export const SEGMENT_VALUES = ["F", "A", "B", "C"] as const;
export type Segment = (typeof SEGMENT_VALUES)[number];
export const segmentLabels: Record<Segment, string> = {
  F: "F · FuelFlo-like",
  A: "A · Best fit",
  B: "B · Good fit",
  C: "C · Later",
};

export const BEST_CHANNEL_VALUES = ["linkedin", "phone", "email", "contact_form", "in_person"] as const;
export type BestChannel = (typeof BEST_CHANNEL_VALUES)[number];
export const bestChannelLabels: Record<BestChannel, string> = {
  linkedin: "LinkedIn",
  phone: "Phone",
  email: "Email (generic address)",
  contact_form: "Contact form",
  in_person: "In person",
};

export const ACCOUNTING_SYSTEM_VALUES = ["tripletex", "fiken", "poweroffice", "visma", "other"] as const;
export type AccountingSystem = (typeof ACCOUNTING_SYSTEM_VALUES)[number];
export const accountingSystemLabels: Record<AccountingSystem, string> = {
  tripletex: "Tripletex",
  fiken: "Fiken",
  poweroffice: "PowerOffice",
  visma: "Visma",
  other: "Other",
};

// The GTM plan's week-4 gate: the pain matters at 5+ office hours a week.
export const WEEK_4_BAR_HOURS = 5;
// The plan allows one follow-up, 4–5 days after first contact.
export const FOLLOW_UP_AFTER_DAYS = 5;

/** Follow-up due date (YYYY-MM-DD) for a lead first contacted on `firstContactedOn`. */
export function followUpDue(firstContactedOn: string) {
  const date = new Date(`${firstContactedOn}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + FOLLOW_UP_AFTER_DAYS);
  return date.toISOString().slice(0, 10);
}

export type PotentialCustomer = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: PotentialCustomerStatus;
  message_sent: boolean;
  call_made: boolean;
  responded: boolean;
  attitude: PotentialCustomerAttitude | null;
  notes: string | null;
  segment: Segment | null;
  employees: number | null;
  location: string | null;
  org_number: string | null;
  website: string | null;
  best_channel: BestChannel | null;
  opener_fact: string | null;
  opener_source: string | null;
  accounting_system: AccountingSystem | null;
  admin_hours_per_week: number | null;
  main_pain: string | null;
  first_contacted_on: string | null;
};
