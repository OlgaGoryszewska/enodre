export const CUSTOMER_STATUS_VALUES = ["lead", "active", "past"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUS_VALUES)[number];

export const customerStatusLabels: Record<CustomerStatus, string> = {
  lead: "Lead",
  active: "Active",
  past: "Past",
};

// The relationship type(s) — a person can carry more than one at once (e.g.
// both a Client and a Partner on the same contract), so this is multi-select,
// unlike status which is a single lifecycle stage.
export const CUSTOMER_ROLE_VALUES = [
  "client",
  "contractor",
  "partner",
  "mentor_advisor",
  "collaborator",
  "vendor",
] as const;
export type CustomerRole = (typeof CUSTOMER_ROLE_VALUES)[number];

export const customerRoleLabels: Record<CustomerRole, string> = {
  client: "Client",
  contractor: "Contractor/Subcontractor",
  partner: "Partner/Co-owner",
  mentor_advisor: "Mentor/Advisor",
  collaborator: "Collaborator",
  vendor: "Vendor",
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
  roles: CustomerRole[];
  notes: string | null;
};
