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
};
