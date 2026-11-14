"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { JOB_AGENT, runJobAgent } from "@/lib/job-agent";
import { PROFILE_FIELDS } from "@/lib/job-profile";
import { RESEARCH_BUDGET, canStartResearch, startOfMonthIso } from "@/lib/lead-candidate";
import { RESEARCH_MODEL } from "@/lib/lead-research";
import { LetterError, writePersonalisedLetter, type LetterUsage } from "@/lib/personalised-letter";
import {
  applyTracking,
  COMPANY_STATUS_VALUES,
  companyKey,
  contactKind,
  recruiterKey,
  searchFilter,
  type CompanyRow,
  type CompanyTracking,
} from "@/lib/application-search";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return supabase;
}

/** "Run now" — the same run the cron does each morning, with your session. */
export async function runJobAgentNow() {
  const supabase = await requireAdmin();
  const { stats } = await runJobAgent(supabase, "manual");
  revalidatePath("/admin/linkedin");
  return { saved: stats.saved, emailed: stats.emailed.length, openApplications: stats.openApplications.length };
}

const SEARCH_LIMIT = 25;

/**
 * Finds a company everywhere on the page, including dismissed and rejected ads
 * the lists don't show. Returns what it could read, and names what it couldn't.
 */
export async function searchApplications(term: string): Promise<{ hits: CompanyRow[]; failed: string[] }> {
  const supabase = await requireAdmin();
  const query = z.string().trim().min(2).max(100).parse(term);

  const [jobs, sent, contacts, saved, headhunters] = await Promise.all([
    supabase
      .from("job_postings")
      .select("id, title, company, location, source, url, status, cover_letter, created_at, applied_at")
      .or(searchFilter(["title", "company", "location"], query))
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT),
    supabase
      .from("job_applications_sent")
      .select("id, created_at, kind, company, to_email, subject, body")
      .or(searchFilter(["company", "to_email", "subject"], query))
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT),
    supabase
      .from("career_contacts")
      .select("id, kind, name, organisation, email, website, linkedin, status, last_contacted_on, notes")
      .or(searchFilter(["name", "organisation", "email", "notes"], query))
      .order("name")
      .limit(SEARCH_LIMIT),
    supabase
      .from("linkedin_jobs")
      .select("id, created_at, title, company, url, note")
      .or(searchFilter(["title", "company", "note"], query))
      .limit(SEARCH_LIMIT),
    supabase
      .from("headhunters")
      .select("id, created_at, title, company, url, note, proposal_sent")
      .or(searchFilter(["title", "company", "note"], query))
      .limit(SEARCH_LIMIT),
  ]);

  const failed = [
    jobs.error && "job ads",
    sent.error && "sent applications",
    contacts.error && "recruiters & companies",
    saved.error && "LinkedIn jobs",
    headhunters.error && "headhunters",
  ].filter((name): name is string => Boolean(name));

  const hits: CompanyRow[] = [
    ...(sent.data ?? []).map((row) => ({
      id: `sent-${row.id}`,
      key: companyKey(row.company ?? row.to_email),
      company: row.company ?? row.to_email,
      what: row.subject,
      contact: row.to_email,
      date: row.created_at,
      status: "Sent",
      url: null,
      text: `Subject: ${row.subject}\n\n${row.body}`,
    })),
    ...(jobs.data ?? []).map((row) => ({
      id: `job-${row.id}`,
      key: row.company ? companyKey(row.company) : null,
      company: row.company ?? "Unknown company",
      what: [row.title, row.location].filter(Boolean).join(" · "),
      contact: null,
      date: row.applied_at ?? row.created_at,
      status: row.status,
      url: row.url,
      text: row.cover_letter,
    })),
    ...(contacts.data ?? []).map((row) => ({
      id: `contact-${row.id}`,
      key: companyKey(row.organisation ?? row.name),
      company: row.organisation ?? row.name,
      what: contactKind(row),
      contact: row.email,
      date: row.last_contacted_on,
      status: row.status.replace(/_/g, " "),
      url: row.website ?? row.linkedin,
      text: row.notes,
    })),
    ...(headhunters.data ?? []).map((row) => ({
      id: `recruiter-${row.id}`,
      key: recruiterKey(row),
      company: row.company ?? row.title,
      what: `Recruiter · ${row.title}`,
      contact: null,
      date: row.created_at,
      status: row.proposal_sent ? "Sent" : "Saved",
      url: row.url,
      text: row.note,
    })),
    ...(saved.data ?? []).map((row) => ({
      id: `saved-${row.id}`,
      key: row.company ? companyKey(row.company) : null,
      company: row.company ?? row.title,
      what: row.title,
      contact: null,
      date: row.created_at,
      status: "Saved",
      url: row.url,
      text: row.note,
    })),
  ];
  const { data: tracked } = await supabase.from("company_tracking").select("*");
  return { hits: applyTracking(hits, (tracked ?? []) as CompanyTracking[]), failed };
}

const trackingSchema = z.object({
  company: z.string().trim().min(1).max(300),
  status: z.enum(COMPANY_STATUS_VALUES).nullable(),
  note: z.string().max(5000),
});

const tableUpdateSchema = z.object({
  company: z.string().trim().min(1).max(300),
  status: z.enum(COMPANY_STATUS_VALUES).nullable().optional(),
  hidden: z.boolean().optional(),
});

/**
 * A change from the Companies table: the status, or removing it from the
 * list. Only the fields given change, so the sticky note stays.
 */
export async function updateCompanyFromTable(input: z.input<typeof tableUpdateSchema>) {
  const supabase = await requireAdmin();
  const values = tableUpdateSchema.parse(input);
  const { error } = await supabase.from("company_tracking").upsert({
    key: companyKey(values.company),
    company: values.company,
    ...(values.status !== undefined ? { status: values.status } : {}),
    ...(values.hidden !== undefined ? { hidden: values.hidden } : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Couldn't update company from the table:", error.message);
    return {
      ok: false,
      error:
        values.hidden !== undefined
          ? "Couldn't remove it. Run supabase/company_tracking.sql again in the Supabase SQL Editor."
          : "Couldn't save the status.",
    };
  }
  revalidatePath("/admin/linkedin");
  return { ok: true, error: null };
}

/** Your status and sticky note on a company's page. */
export async function saveCompanyTracking(input: z.input<typeof trackingSchema>) {
  const supabase = await requireAdmin();
  const values = trackingSchema.parse(input);
  const key = companyKey(values.company);
  const { error } = await supabase
    .from("company_tracking")
    .upsert({ key, ...values, updated_at: new Date().toISOString() });
  if (error) {
    console.error("Couldn't save company tracking:", error.message);
    return { ok: false, error: "Couldn't save. Has supabase/company_tracking.sql been run?" };
  }
  revalidatePath("/admin/linkedin");
  revalidatePath("/admin/linkedin/company/[key]", "page");
  return { ok: true, error: null };
}

const statusSchema = z.enum(["new", "applied", "dismissed", "interview", "rejected"]);

export async function setJobPostingStatus(id: string, status: z.input<typeof statusSchema>) {
  const supabase = await requireAdmin();
  const value = statusSchema.parse(status);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("job_postings")
    .update({
      status: value,
      updated_at: now,
      ...(value === "applied" ? { applied_at: now, applied_via: "form" } : {}),
      // Back to "new" = not applied after all.
      ...(value === "new" ? { applied_at: null, applied_via: null } : {}),
    })
    .eq("id", z.uuid().parse(id));
  if (error) throw error;
  revalidatePath("/admin/linkedin");
}

/** Stores the CV privately; the agent attaches it to every application. */
export async function uploadCv(formData: FormData) {
  const supabase = await requireAdmin();
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a PDF first.");
  if (file.type !== "application/pdf") throw new Error("The CV must be a PDF.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Keep the CV under 5 MB.");
  const { error } = await supabase.storage
    .from("private")
    .upload(JOB_AGENT.cvPath, file, { upsert: true, contentType: "application/pdf" });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  revalidatePath("/admin/linkedin");
}

/** Saves one of your standard answers for application forms. */
export async function saveJobProfileAnswer(key: string, value: string) {
  const supabase = await requireAdmin();
  const field = PROFILE_FIELDS.find((item) => item.key === key);
  if (!field) throw new Error("Unknown field.");
  const { error } = await supabase
    .from("job_profile")
    .upsert({ key, value: value.trim().slice(0, 2000), updated_at: new Date().toISOString() });
  if (error) throw error;
  revalidatePath("/admin/linkedin");
}

/** Preview: the full search and plan, but nothing saved and nothing sent. */
export async function previewJobAgent() {
  const supabase = await requireAdmin();
  const { stats, report, preview } = await runJobAgent(supabase, "manual", { dryRun: true });
  return {
    stats: { found: stats.found, matched: stats.matched, cleared: stats.cleared ?? 0, problems: stats.problems },
    report,
    preview,
  };
}

const letterInputSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200),
  adText: z.string().trim().max(20_000),
  language: z.enum(["en", "no"]),
});

export type LetterResult =
  | {
      ok: true;
      letter: string;
      facts: { fact: string; source_url: string }[];
      caveat: string | null;
      costUsd: number;
    }
  | { ok: false; error: string };

/** Researches a company and writes a letter. Counts toward the monthly AI budget. */
export async function personaliseLetter(input: z.input<typeof letterInputSchema>): Promise<LetterResult> {
  const supabase = await requireAdmin();
  const values = letterInputSchema.parse(input);

  const { data: runs, error: runsError } = await supabase
    .from("lead_research_runs")
    .select("cost_usd")
    .gte("created_at", startOfMonthIso());
  if (runsError) return { ok: false, error: "Couldn't check the monthly AI budget." };
  const spent = (runs ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0);
  if (!canStartResearch(spent)) {
    return {
      ok: false,
      error: `Monthly AI budget reached ($${spent.toFixed(2)} of $${RESEARCH_BUDGET.monthlyUsd}).`,
    };
  }

  const record = async (outcome: "drafted" | "failed", usage: LetterUsage, message: string | null) => {
    const { error } = await supabase.from("lead_research_runs").insert({
      candidate_id: null,
      outcome,
      model: RESEARCH_MODEL,
      cost_usd: usage.costUsd,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_read_tokens: usage.cacheReadTokens,
      cache_write_tokens: usage.cacheWriteTokens,
      web_search_requests: usage.webSearchRequests,
      web_fetch_requests: usage.webFetchRequests,
      api_requests: usage.apiRequests,
      error: message,
    });
    // Losing a spend record would undercount the budget.
    if (error) console.error("Failed to record letter run:", error);
  };

  try {
    const { letter, usage } = await writePersonalisedLetter(values);
    await record("drafted", usage, null);
    return { ok: true, ...letter, costUsd: usage.costUsd };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("Letter failed:", error);
    if (error instanceof LetterError) await record("failed", error.usage, message);
    if (/credit balance/i.test(message)) return { ok: false, error: "The Anthropic account is out of credits." };
    if (/api key|authentication/i.test(message)) {
      return { ok: false, error: "The Anthropic API key isn't set up for this environment." };
    }
    return { ok: false, error: "Couldn't write the letter right now. Try again." };
  }
}
