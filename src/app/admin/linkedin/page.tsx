import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { Accordion } from "@/components/admin/Accordion";
import { AdminNav } from "@/components/admin/AdminNav";
import { createClient } from "@/lib/supabase/server";
import type { JobLead } from "@/lib/job-lead";
import {
  JobAgentPanel,
  type JobAgentRun,
  type JobPosting,
  type SentApplication,
} from "@/components/admin/JobAgentPanel";
import {
  previewJobAgent,
  runJobAgentNow,
  personaliseLetter,
  saveJobProfileAnswer,
  searchApplications,
  updateCompanyFromTable,
  setJobPostingStatus,
  uploadCv,
} from "@/app/admin/linkedin/job-agent-actions";
import { ApplicationDetails } from "@/components/admin/ApplicationDetails";
import { JobAgentReportCard, type JobAgentReportRun } from "@/components/admin/JobAgentReportCard";
import { CareerContacts } from "@/components/admin/CareerContacts";
import { EmailReplies, type EmailReply } from "@/components/admin/EmailReplies";
import { checkRepliesNow, setReplyAutomatic } from "@/app/admin/reply-actions";
import { JobMessageTemplates } from "@/components/admin/JobMessageTemplates";
import { ApplicationSearch } from "@/components/admin/ApplicationSearch";
import { messagedCompanies, type CompanyTracking, type SentRow } from "@/lib/application-search";
import { isGulfAddress } from "@/lib/email-replies";
import {
  addCareerContact,
  addCareerCandidates,
  deleteCareerContact,
  findCareerCandidates,
  prepareCareerContacts,
  sendCareerContacts,
  updateCareerContact,
} from "@/app/admin/linkedin/career-contacts-actions";
import type { CareerContact } from "@/lib/career-contact";

const CAREER_REPORT_URL = "https://claude.ai/artifact/Fh9yfH9h19tTg3c2paczgj";
import { JOB_AGENT } from "@/lib/job-agent";

// "Run now" on the job agent can take a few minutes.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Applying for jobs",
  description: "Job search tracking — LinkedIn, headhunters, and AI-found matches.",
};

export default async function AdminLinkedInPage() {
  const supabase = await createClient();

  // Headhunters you sent a CV to: listed in the Companies table and search.
  const { data: headhuntersData, error: headhuntersError } = await supabase
    .from("headhunters")
    .select("*")
    .order("created_at", { ascending: false });

  // Job agent (job_agent.sql) — a missing table means the migration hasn't run.
  const [postingsResult, runResult, openResult, cvList, profileResult] = await Promise.all([
    supabase
      .from("job_postings")
      .select("*")
      .in("status", ["new", "applied", "interview"])
      .order("score", { ascending: false })
      .limit(200),
    supabase
      .from("job_agent_runs")
      .select("id, created_at, trigger, stats, report")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("open_applications").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.storage.from("private").list("cv"),
    supabase.from("job_profile").select("key, value"),
  ]);
  const { data: sentData } = await supabase
    .from("job_applications_sent")
    .select("id, created_at, kind, company, to_email, subject, body, attachment, job_postings(status)")
    .order("created_at", { ascending: false })
    .limit(200);
  const sentApplications = (sentData ?? []) as unknown as (SentApplication & SentRow)[];
  const contactsResult = await supabase.from("career_contacts").select("*");
  const trackingResult = await supabase.from("company_tracking").select("*");
  const repliesResult = await supabase
    .from("email_replies")
    .select("id, from_email, from_name, subject, received_at, snippet, is_auto, lead_id, company_key, company")
    .eq("kind", "job")
    .order("received_at", { ascending: false })
    .limit(100);
  const jobReplies = ((repliesResult.data ?? []) as EmailReply[]).filter((reply) => !isGulfAddress(reply.from_email));
  const jobProfile = Object.fromEntries(
    (profileResult.data ?? []).map((row) => [row.key as string, row.value as string])
  );
  const jobAgentSetupMissing = Boolean(postingsResult.error);
  if (postingsResult.error) console.error("Job agent tables missing or unreadable:", postingsResult.error.message);
  const jobPostings = (postingsResult.data ?? []) as JobPosting[];
  const jobAgentRuns = (runResult.data ?? []) as JobAgentRun[];
  const cvUploaded = (cvList.data ?? []).some((file) => `cv/${file.name}` === JOB_AGENT.cvPath);

  if (headhuntersError) {
    console.error("Failed to load headhunters:", headhuntersError);
  }

  const headhunters = (headhuntersData ?? []) as JobLead[];

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <div className="mt-10">
        <h1 className="page-title text-2xl">Applying for jobs</h1>
      </div>

      <div className="mt-6">
        <ApplicationSearch
          companies={messagedCompanies(
            sentApplications,
            (contactsResult.data ?? []) as CareerContact[],
            (trackingResult.data ?? []) as CompanyTracking[],
            headhunters,
            jobReplies
              .filter((reply) => !reply.is_auto && reply.company_key)
              .map((reply) => ({
                key: reply.company_key!,
                company: reply.company ?? reply.from_email,
                date: reply.received_at,
              }))
          )}
          onSearch={searchApplications}
          onUpdate={updateCompanyFromTable}
        />
      </div>

      <div className="mt-10">
        <EmailReplies
          title="Replies"
          inbox="your Gmail"
          replies={jobReplies}
          setupMissing={Boolean(repliesResult.error)}
          onCheck={checkRepliesNow}
          onSetAutomatic={setReplyAutomatic}
        />
      </div>

      <div className="mt-10">
        <Accordion
          icon={<Bot className="h-4 w-4" aria-hidden="true" />}
          title="Job agent report"
          subtitle={`${jobPostings.filter((job) => job.status === "new").length} jobs waiting · ${sentApplications.length} emails sent`}
        >
          <JobAgentReportCard
            bare
            run={(jobAgentRuns[0] ?? null) as JobAgentReportRun | null}
            showLink={false}
            totals={[
              { label: "Jobs waiting", value: jobPostings.filter((job) => job.status === "new").length },
              { label: "Applied", value: jobPostings.filter((job) => job.status === "applied").length },
              { label: "Interviews", value: jobPostings.filter((job) => job.status === "interview").length },
              { label: "Emails sent by the agent", value: sentApplications.length },
            ]}
          />
        </Accordion>
      </div>

      <div className="mt-10">
        <JobAgentPanel
          postings={jobPostings}
          runs={jobAgentRuns}
          sentApplications={sentApplications}
          cvUploaded={cvUploaded}
          openApplicationsSent={openResult.count ?? 0}
          setupMissing={jobAgentSetupMissing}
          onRunNow={runJobAgentNow}
          onPreview={previewJobAgent}
          onSetStatus={setJobPostingStatus}
          onUploadCv={uploadCv}
        />
      </div>

      <div className="mt-10">
        <CareerContacts
          contacts={(contactsResult.data ?? []) as CareerContact[]}
          setupMissing={Boolean(contactsResult.error)}
          reportUrl={CAREER_REPORT_URL}
          onAdd={addCareerContact}
          onUpdate={updateCareerContact}
          onDelete={deleteCareerContact}
          onPrepare={prepareCareerContacts}
          onSend={sendCareerContacts}
          onFind={findCareerCandidates}
          onAddCandidates={addCareerCandidates}
        />
      </div>

      <div className="mt-10">
        <JobMessageTemplates />
      </div>

      {!profileResult.error && (
        <div className="mt-10">
          <ApplicationDetails profile={jobProfile} onSave={saveJobProfileAnswer} onWriteLetter={personaliseLetter} />
        </div>
      )}
    </section>
  );
}
