export type JobLead = {
  id: string;
  created_at: string;
  title: string;
  company: string | null;
  url: string;
  proposal_sent: boolean;
  note: string | null;
};
