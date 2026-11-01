import type { SupabaseClient } from "@supabase/supabase-js";
import { collectJobs, type FoundJob, type SourceReport } from "@/lib/job-sources";
import {
  adLanguage,
  applicationEmail,
  coverLetter,
  openApplication,
  scoreJob,
  type TargetCity,
  notEnglishFriendly,
} from "@/lib/job-matching";
import { getGmailMailer } from "@/lib/mailer";
import { searchCompanies } from "@/lib/brreg";
import { findCompanyEmails } from "@/lib/email-discovery";
import { LEAD_INDUSTRIES } from "@/lib/lead-candidate";

// The daily job agent: finds new developer/UX ads in the target cities,
// scores them against the CV, keeps up to 50 a day with a cover letter each,
// emails the CV where an ad asks for applications by email, sends open
// applications to Oslo agencies, and emails a report. Free: no AI.

export const JOB_AGENT = {
  /** New matches kept per run. */
  newPerRun: 50,
  /** Below this the ad isn't worth your time. */
  minScore: 30,
  /** Applications sent by email only for good matches. */
  emailApplyMinScore: 50,
  emailAppliesPerRun: 20,
  openApplicationsPerRun: 10,
  /** First run looks back a week; after that, two days (overlap is de-duplicated). */
  firstRunDays: 7,
  dailyDays: 2,
  cvPath: "cv/cv.pdf",
  cvFileName: "Olga_Goryszewska_CV.pdf",
  timeBudgetMs: 240_000,
};

export type JobAgentStats = {
  sources: SourceReport[];
  found: number;
  matched: number;
  saved: number;
  byCity: Partial<Record<TargetCity | "LinkedIn" | "FINN", number>>;
  emailed: { title: string; company: string | null; to: string }[];
  openApplications: { company: string; to: string }[];
  openWithoutEmail: number;
  /** Waiting jobs cleared because they no longer fit (e.g. senior roles). */
  cleared?: number;
  problems: string[];
};

const normalise = (text: string | null) =>
  (text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

async function loadCv(supabase: SupabaseClient) {
  const { data, error } = await supabase.storage.from("private").download(JOB_AGENT.cvPath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export type JobAgentPreview = {
  jobs: {
    title: string;
    company: string | null;
    city: string | null;
    location: string;
    source: string;
    score: number;
    matched: string[];
    url: string;
  }[];
  applications: { kind: "ad" | "open"; company: string | null; to: string; subject: string; body: string }[];
};

/**
 * One run. With `dryRun` it searches and plans exactly as a real run would
 * but writes nothing, sends nothing and emails no report — the Preview.
 */
export async function runJobAgent(
  supabase: SupabaseClient,
  trigger: "cron" | "manual",
  options: { dryRun?: boolean } = {}
) {
  const dryRun = options.dryRun ?? false;
  const preview: JobAgentPreview = { jobs: [], applications: [] };
  const started = Date.now();
  const timeLeft = () => Date.now() - started < JOB_AGENT.timeBudgetMs;
  const stats: JobAgentStats = {
    sources: [],
    found: 0,
    matched: 0,
    saved: 0,
    byCity: {},
    emailed: [],
    openApplications: [],
    openWithoutEmail: 0,
    problems: [],
  };

  const { count: previousRuns } = await supabase.from("job_agent_runs").select("id", { count: "exact", head: true });
  const days = previousRuns ? JOB_AGENT.dailyDays : JOB_AGENT.firstRunDays;

  // 1. Collect from every source.
  const { jobs, reports } = await collectJobs(days);
  // LinkedIn matches saved by the older "AI-found LinkedIn jobs" card (last two
  // weeks) join the same list, so nothing it found is lost.
  const { data: earlierLinkedIn } = await supabase
    .from("ai_job_matches")
    .select("title, company, url, created_at")
    .eq("source", "linkedin")
    .gte("created_at", new Date(Date.now() - 14 * 86_400_000).toISOString());
  for (const match of earlierLinkedIn ?? []) {
    jobs.push({
      source: "linkedin",
      externalId: (match.url as string).match(/\/jobs\/view\/(\d+)/)?.[1] ?? (match.url as string),
      title: match.title as string,
      company: (match.company as string | null) ?? null,
      location: "LinkedIn alert",
      city: null,
      url: match.url as string,
      text: "",
      publishedAt: null,
    });
  }
  stats.sources = reports;
  stats.found = jobs.length;

  // 2. Score, drop the poor fits and the ones already seen.
  const { data: existing, error: existingError } = await supabase
    .from("job_postings")
    .select("source, external_id, title, company");
  if (existingError) throw existingError;
  const seenIds = new Set((existing ?? []).map((row) => `${row.source}:${row.external_id}`));
  const seenTitles = new Set((existing ?? []).map((row) => `${normalise(row.title)}|${normalise(row.company)}`));

  const fresh = new Map<string, FoundJob & { score: number; matched: string[] }>();
  for (const job of jobs) {
    // Alert emails (LinkedIn, FINN) come from searches you set up for your cities.
    if (!job.city && job.source !== "linkedin" && job.source !== "finn") continue;
    const titleKey = `${normalise(job.title)}|${normalise(job.company)}`;
    if (seenIds.has(`${job.source}:${job.externalId}`) || seenTitles.has(titleKey)) continue;
    // Spain: English-speaking, international roles only.
    if (job.city === "Spain" && notEnglishFriendly(`${job.title}\n${job.text}`)) continue;
    const { score, matched, rejected } = scoreJob({
      title: job.title,
      text: `${job.company ?? ""}\n${job.text}`,
    });
    if (rejected || score < JOB_AGENT.minScore) continue;
    const current = fresh.get(titleKey);
    if (!current || current.score < score) fresh.set(titleKey, { ...job, score, matched });
  }
  stats.matched = fresh.size;
  const keep = [...fresh.values()].sort((a, b) => b.score - a.score).slice(0, JOB_AGENT.newPerRun);

  // Jobs still waiting in the list are re-checked with today's rules (e.g.
  // senior roles are out) — those that no longer fit are cleared away.
  {
    const { data: waiting } = await supabase
      .from("job_postings")
      .select("id, title, company, snippet")
      .eq("status", "new");
    const outdated = (waiting ?? [])
      .filter(
        (row) => scoreJob({ title: row.title as string, text: `${row.company ?? ""}\n${row.snippet ?? ""}` }).rejected
      )
      .map((row) => row.id as string);
    if (outdated.length > 0) {
      if (!dryRun) {
        await supabase
          .from("job_postings")
          .update({ status: "dismissed", updated_at: new Date().toISOString() })
          .in("id", outdated);
      }
      stats.cleared = outdated.length;
    }
  }

  // 3. Save them, each with its cover letter.
  const rows = keep.map((job) => {
    const language = adLanguage(`${job.title} ${job.text}`);
    return {
      source: job.source,
      external_id: job.externalId,
      title: job.title,
      company: job.company,
      location: job.location,
      city: job.city,
      url: job.url,
      snippet: job.text.slice(0, 600) || null,
      published_at: job.publishedAt ? new Date(job.publishedAt).toISOString() : null,
      score: job.score,
      matched: job.matched,
      language,
      apply_email: applicationEmail(job.text),
      cover_letter: coverLetter({ title: job.title, company: job.company, matched: job.matched, language }),
    };
  });
  let saved: {
    id: string;
    title: string;
    company: string | null;
    apply_email: string | null;
    score: number;
    language: string;
    cover_letter: string | null;
  }[] = [];
  preview.jobs = rows.map((row) => ({
    title: row.title,
    company: row.company,
    city: row.city,
    location: row.location,
    source: row.source,
    score: row.score,
    matched: row.matched,
    url: row.url,
  }));
  if (dryRun) {
    saved = rows.map((row, index) => ({
      id: `preview-${index}`,
      title: row.title,
      company: row.company,
      apply_email: row.apply_email,
      score: row.score,
      language: row.language,
      cover_letter: row.cover_letter,
    }));
  } else if (rows.length > 0) {
    const { data, error } = await supabase
      .from("job_postings")
      .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true })
      .select("id, title, company, apply_email, score, language, cover_letter");
    if (error) throw error;
    saved = data ?? [];
  }
  stats.saved = saved.length;
  for (const row of rows) {
    const key = row.city ?? (row.source === "finn" ? "FINN" : "LinkedIn");
    stats.byCity[key] = (stats.byCity[key] ?? 0) + 1;
  }

  const mailer = getGmailMailer();
  const cv = await loadCv(supabase);
  if (!mailer) stats.problems.push("Gmail isn't set up (GMAIL_USER / GMAIL_APP_PASSWORD) — nothing was sent.");
  if (!cv) stats.problems.push("No CV uploaded yet — upload it on Find jobs. Nothing was sent.");

  // Everything sent so far: the guard against applying twice.
  const { data: sentRows, error: sentError } = await supabase
    .from("job_applications_sent")
    .select("to_email, job_posting_id, org_number, company");
  if (sentError) stats.problems.push("Run job_agent.sql again (sent-applications log missing) — nothing was sent.");
  const sentTo = new Set((sentRows ?? []).map((row) => (row.to_email as string).toLowerCase()));
  const sentJobs = new Set((sentRows ?? []).map((row) => row.job_posting_id as string | null).filter(Boolean));
  const sentOrgs = new Set((sentRows ?? []).map((row) => row.org_number as string | null).filter(Boolean));
  const sentCompanies = new Set((sentRows ?? []).map((row) => normalise(row.company as string | null)).filter(Boolean));
  // The preview plans applications even before the CV is uploaded, so you can see them.
  const canSend = dryRun ? !sentError : Boolean(mailer && cv && !sentError);
  const attachment = cv ? [{ filename: JOB_AGENT.cvFileName, content: cv, contentType: "application/pdf" }] : [];

  /**
   * Sends one application — at most once per job ad, per company and per
   * address. The log row is written first (a unique index backs it up), and
   * removed again if the email fails, so a retry is possible but a double never.
   */
  async function sendOnce(application: {
    kind: "ad" | "open";
    jobPostingId?: string;
    orgNumber?: string;
    company: string | null;
    to: string;
    subject: string;
    body: string;
  }): Promise<boolean> {
    const to = application.to.toLowerCase();
    const company = normalise(application.company);
    if (
      sentTo.has(to) ||
      (application.jobPostingId && sentJobs.has(application.jobPostingId)) ||
      (application.orgNumber && sentOrgs.has(application.orgNumber)) ||
      (company && sentCompanies.has(company))
    ) {
      return false;
    }
    if (dryRun) {
      preview.applications.push({
        kind: application.kind,
        company: application.company,
        to,
        subject: application.subject,
        body: application.body,
      });
      sentTo.add(to);
      if (application.orgNumber) sentOrgs.add(application.orgNumber);
      if (company) sentCompanies.add(company);
      return true;
    }
    const { data: logged, error } = await supabase
      .from("job_applications_sent")
      .insert({
        kind: application.kind,
        job_posting_id: application.jobPostingId ?? null,
        org_number: application.orgNumber ?? null,
        company: application.company,
        to_email: to,
        subject: application.subject,
        body: application.body,
        attachment: JOB_AGENT.cvFileName,
      })
      .select("id")
      .single();
    if (error || !logged) return false; // already sent (unique index) or not logged: don't send
    try {
      await mailer!.transporter.sendMail({
        from: `"Olga Goryszewska" <${mailer!.address}>`,
        to,
        subject: application.subject,
        text: application.body,
        attachments: attachment,
      });
    } catch (sendError) {
      await supabase.from("job_applications_sent").delete().eq("id", logged.id);
      throw sendError;
    }
    sentTo.add(to);
    if (application.jobPostingId) sentJobs.add(application.jobPostingId);
    if (application.orgNumber) sentOrgs.add(application.orgNumber);
    if (company) sentCompanies.add(company);
    return true;
  }

  // 4. Apply by email where the ad asks for it.
  if (canSend) {
    const byEmail = saved
      .filter((row) => row.apply_email && row.score >= JOB_AGENT.emailApplyMinScore)
      .slice(0, JOB_AGENT.emailAppliesPerRun);
    for (const row of byEmail) {
      if (!timeLeft()) break;
      try {
        const sent = await sendOnce({
          kind: "ad",
          jobPostingId: row.id,
          company: row.company,
          to: row.apply_email!,
          subject: row.language === "no" ? `Søknad: ${row.title}` : `Application: ${row.title}`,
          body: row.cover_letter ?? "",
        });
        if (!sent) continue;
        if (!dryRun) {
          await supabase
            .from("job_postings")
            .update({
              status: "applied",
              applied_via: "email",
              applied_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }
        stats.emailed.push({ title: row.title, company: row.company, to: row.apply_email! });
      } catch (error) {
        stats.problems.push(`Couldn't email ${row.apply_email}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
  }

  // 5. Open applications to Oslo agencies and consultancies — not the ones
  // in Enodre's outreach pipeline, and never a company already applied to.
  if (canSend && timeLeft()) {
    try {
      const [done, candidates, leads] = await Promise.all([
        supabase.from("open_applications").select("org_number"),
        supabase.from("lead_candidates").select("org_number"),
        supabase.from("potential_customers").select("org_number"),
      ]);
      const exclude = new Set(
        [...(done.data ?? []), ...(candidates.data ?? []), ...(leads.data ?? [])]
          .map((row) => (row.org_number as string | null)?.replace(/\s/g, ""))
          .filter((value): value is string => Boolean(value))
      );
      for (const org of sentOrgs) exclude.add(org as string);
      const { companies } = await searchCompanies({
        industryCodes: LEAD_INDUSTRIES.filter((industry) => industry.priority === "P").map((industry) => industry.code),
        municipalityNumbers: ["0301"], // Oslo
        minEmployees: 5,
        maxEmployees: 300,
        limit: JOB_AGENT.openApplicationsPerRun * 3,
        exclude,
      });
      for (const company of companies) {
        if (stats.openApplications.length >= JOB_AGENT.openApplicationsPerRun || !timeLeft()) break;
        const search = await findCompanyEmails({
          website: company.website,
          registerEmail: company.email,
          companyName: company.name,
          orgNumber: company.orgNumber,
        }).catch(() => null);
        const to = search?.emails.find((item) => item.generic)?.email ?? null;
        if (!to) {
          stats.openWithoutEmail++;
          if (!dryRun) {
            await supabase
              .from("open_applications")
              .insert({ org_number: company.orgNumber, company: company.name, status: "no_email" });
          }
          continue;
        }
        const letter = openApplication(company.name);
        try {
          const sent = await sendOnce({
            kind: "open",
            orgNumber: company.orgNumber,
            company: company.name,
            to,
            subject: letter.subject,
            body: letter.body,
          });
          if (!sent) continue;
          if (!dryRun) {
            await supabase
              .from("open_applications")
              .insert({ org_number: company.orgNumber, company: company.name, email: to, status: "sent" });
          }
          stats.openApplications.push({ company: company.name, to });
        } catch (error) {
          const message = error instanceof Error ? error.message : "failed";
          await supabase.from("open_applications").insert({
            org_number: company.orgNumber,
            company: company.name,
            email: to,
            status: "failed",
            error: message,
          });
          stats.problems.push(`Open application to ${company.name} failed: ${message}`);
        }
      }
    } catch (error) {
      stats.problems.push(`Open applications: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  if (dryRun) {
    const report = buildReport(stats, [...preview.jobs].slice(0, 15), true);
    return { stats, report, preview };
  }

  // 6. The report — saved, and emailed to you.
  const { data: top } = await supabase
    .from("job_postings")
    .select("title, company, city, score, url, status")
    .eq("status", "new")
    .order("score", { ascending: false })
    .limit(15);
  const report = buildReport(stats, top ?? []);
  await supabase.from("job_agent_runs").insert({ trigger, stats, report });
  if (mailer) {
    await mailer.transporter
      .sendMail({
        from: `"Job agent" <${mailer.address}>`,
        to: process.env.JOB_AGENT_REPORT_TO || mailer.address,
        subject: `Job agent: ${stats.saved} new matches, ${stats.emailed.length + stats.openApplications.length} applications sent`,
        text: report,
      })
      .catch((error) => console.error("Job agent report email failed:", error));
  }
  return { stats, report, preview };
}

function buildReport(
  stats: JobAgentStats,
  top: { title: string; company: string | null; city: string | null; score: number; url: string }[],
  isPreview = false
) {
  const lines: string[] = [];
  if (isPreview) lines.push("PREVIEW — nothing was saved or sent.", "");
  lines.push(
    `${isPreview ? "New matches found" : "New matches saved"}: ${stats.saved} (of ${stats.found} ads found, ${stats.matched} fit your CV)`
  );
  const cities = Object.entries(stats.byCity).map(([city, count]) => `${city} ${count}`);
  if (cities.length) lines.push(`By city: ${cities.join(" · ")}`);
  lines.push(
    `${isPreview ? "Would apply by email" : "Applications emailed"}: ${stats.emailed.length} · Open applications (Oslo): ${stats.openApplications.length}`
  );
  if (stats.cleared) lines.push(`Cleared from your list (no longer fit, e.g. senior roles): ${stats.cleared}`);
  if (stats.emailed.length) {
    lines.push("", isPreview ? "Would apply by email:" : "Applied by email:");
    for (const item of stats.emailed)
      lines.push(`- ${item.title}${item.company ? `, ${item.company}` : ""} → ${item.to}`);
  }
  if (stats.openApplications.length) {
    lines.push("", isPreview ? "Would send open applications to:" : "Open applications sent:");
    for (const item of stats.openApplications) lines.push(`- ${item.company} → ${item.to}`);
  }
  if (top.length) {
    lines.push("", "Best matches to apply for (forms — one click each on Find jobs):");
    for (const job of top) {
      lines.push(`- [${job.score}] ${job.title}${job.company ? `, ${job.company}` : ""} (${job.city ?? "alert"})`);
      lines.push(`  ${job.url}`);
    }
  }
  lines.push("", "Sources:");
  for (const source of stats.sources) {
    lines.push(`- ${source.source}: ${source.skipped ?? source.error ?? `${source.found} ads`}`);
  }
  if (stats.problems.length) {
    lines.push("", "Needs you:");
    for (const problem of stats.problems) lines.push(`- ${problem}`);
  }
  return lines.join("\n");
}
