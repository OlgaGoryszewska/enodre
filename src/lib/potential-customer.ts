import { addBusinessDays, FOLLOW_UP_BUSINESS_DAYS, parseLegacyNotes } from "@/lib/gtm-logic";
import type { Industry } from "@/lib/industry-playbooks";

/** Research stored on the lead. Facts carry a source; the rest are hypotheses. */
export type LeadResearchData = {
  summary?: string | null;
  facts?: { fact: string; source_url: string }[];
  signals?: { signal: string; source_url: string }[];
  likely_pain?: string | null;
  pain_evidence?: string | null;
  how_we_help?: string | null;
  confidence?: "high" | "medium" | "low" | null;
  message_no?: string | null;
  // The message opening (part A), written from one verified fact.
  opener_fact?: string | null;
  opener_no?: string | null;
  opener_en?: string | null;
  researched_at?: string | null;
};

// Pipeline stages, in order. Keep in sync with the check in supabase/gtm_command_centre.sql.
export const POTENTIAL_CUSTOMER_STATUS_VALUES = [
  "new",
  "contacted",
  "interested",
  "call_booked",
  "call_done",
  "proposal_sent",
  "converted",
  "not_interested",
] as const;

export type PotentialCustomerStatus = (typeof POTENTIAL_CUSTOMER_STATUS_VALUES)[number];

export const potentialCustomerStatusLabels: Record<PotentialCustomerStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  call_booked: "Discovery call booked",
  call_done: "Discovery call done",
  proposal_sent: "Proposal sent",
  converted: "Pilot signed",
  not_interested: "Not interested",
};

// No routine follow-up reminders once a lead is won or out.
export const CLOSED_STATUSES: readonly PotentialCustomerStatus[] = ["converted", "not_interested"];

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
export const SEGMENT_VALUES = ["F", "A", "B", "C", "P"] as const;
export type Segment = (typeof SEGMENT_VALUES)[number];
export const segmentLabels: Record<Segment, string> = {
  F: "F · FuelFlo-like",
  A: "A · Best fit",
  B: "B · Good fit",
  C: "C · Later",
  P: "P · Partner (dev/UX capacity)",
};

// Keep in sync with the check in supabase/partner_track.sql.
export const COUNTRY_VALUES = ["NO", "PL"] as const;
export type Country = (typeof COUNTRY_VALUES)[number];
export const countryLabels: Record<Country, string> = { NO: "Norway", PL: "Poland" };

/**
 * Poland's electronic communications law (Prawo komunikacji elektronicznej,
 * art. 398) bans commercial email and sales calls without prior consent —
 * B2B too. So a Polish lead is emailed only once they've replied.
 */
export function needsConsentFirst(lead: Pick<PotentialCustomer, "country" | "responded">) {
  return lead.country === "PL" && !lead.responded;
}

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
/**
 * The lead's next follow-up date (YYYY-MM-DD) or null when none is due.
 * `next_follow_up_on` is the source of truth; until gtm_command_centre.sql has
 * run the column is missing (undefined), so fall back to the old rule.
 */
export function followUpDate(lead: PotentialCustomer): string | null {
  if (lead.next_follow_up_on !== undefined) return lead.next_follow_up_on;
  if (!lead.first_contacted_on || lead.responded || CLOSED_STATUSES.includes(lead.status)) return null;
  return addBusinessDays(lead.first_contacted_on, FOLLOW_UP_BUSINESS_DAYS);
}

/** The opener fact + source, reading older notes-only records too. */
export function leadOpener(lead: Pick<PotentialCustomer, "opener_fact" | "opener_source" | "notes">) {
  const legacy = lead.opener_fact ? {} : parseLegacyNotes(lead.notes);
  return {
    fact: lead.opener_fact ?? legacy.openerFact ?? null,
    source: lead.opener_source ?? legacy.openerSource ?? null,
  };
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
  // undefined until gtm_command_centre.sql has been run.
  next_follow_up_on?: string | null;
  next_action?: string | null;
  // Added by outreach_system.sql — undefined until it has run.
  industry?: Industry | null;
  research?: LeadResearchData | null;
  do_not_contact?: boolean;
  deal_value_nok?: number | null;
  // Added by partner_track.sql — undefined until it has run (= Norway).
  country?: Country | null;
};
