export const CUSTOMER_STATUS_VALUES = ["lead", "active", "past"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUS_VALUES)[number];

export const customerStatusLabels: Record<CustomerStatus, string> = {
  lead: "Lead",
  active: "Active",
  past: "Past",
};

export type Customer = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: CustomerStatus;
  notes: string | null;
};
