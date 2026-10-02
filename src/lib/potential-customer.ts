export const POTENTIAL_CUSTOMER_STATUS_VALUES = ["new", "contacted", "interested", "converted", "not_interested"] as const;

export type PotentialCustomerStatus = (typeof POTENTIAL_CUSTOMER_STATUS_VALUES)[number];

export const potentialCustomerStatusLabels: Record<PotentialCustomerStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  converted: "Converted",
  not_interested: "Not interested",
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
  notes: string | null;
};
