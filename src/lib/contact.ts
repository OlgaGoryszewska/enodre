export const STATUS_VALUES = ["new", "contacted", "archived"] as const;

export type ContactStatus = (typeof STATUS_VALUES)[number];

export const statusLabels: Record<ContactStatus, string> = {
  new: "New",
  contacted: "Contacted",
  archived: "Archived",
};

export type Contact = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  company: string | null;
  email: string;
  challenge: string;
  success_looks_like: string | null;
  urgency: string;
  anything_else: string | null;
  status: ContactStatus;
};
