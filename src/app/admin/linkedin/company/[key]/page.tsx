import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { CompanyTrackerCard } from "@/components/admin/CompanyTrackerCard";
import { saveCompanyTracking } from "@/app/admin/linkedin/job-agent-actions";
import { createClient } from "@/lib/supabase/server";
import { companyKey, recruiterKey, searchFilter, type CompanyTracking } from "@/lib/application-search";
import { careerKindLabels, careerStatusLabels, type CareerContact } from "@/lib/career-contact";

export const metadata: Metadata = { title: "Company" };

const MATCH_LIMIT = 200;

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Oslo",
  });

const line = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-card p-5">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 grid gap-2 text-sm">{children}</div>
    </section>
  );
}

function Letter({ summary, text }: { summary: string; text: string }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold text-ink-muted hover:text-foreground">{summary}</summary>
      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 font-sans leading-5">{text}</pre>
    </details>
  );
}

/** One company: your status and note, and everything we have on it. */
export default async function CompanyPage({ params }: { params: Promise<{ key: string }> }) {
  const { key: encoded } = await params;
  let key: string;
  try {
    key = companyKey(decodeURIComponent(encoded));
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const [repliesResult, tracking, sentResult, jobsResult, contactsResult, savedResult, headhuntersResult] =
    await Promise.all([
      supabase
        .from("email_replies")
        .select("id, from_email, from_name, subject, received_at, snippet, is_auto")
        .eq("company_key", key)
        .order("received_at", { ascending: false })
        .limit(MATCH_LIMIT),
      supabase.from("company_tracking").select("key, company, status, note").eq("key", key).maybeSingle(),
      supabase
        .from("job_applications_sent")
        .select("id, created_at, kind, company, to_email, subject, body")
        .or(searchFilter(["company", "to_email"], key))
        .order("created_at", { ascending: false })
        .limit(MATCH_LIMIT),
      supabase
        .from("job_postings")
        .select("id, title, company, location, source, url, status, cover_letter, created_at, applied_at")
        .or(searchFilter(["company"], key))
        .order("created_at", { ascending: false })
        .limit(MATCH_LIMIT),
      supabase
        .from("career_contacts")
        .select("*")
        .or(searchFilter(["name", "organisation"], key))
        .limit(MATCH_LIMIT),
      supabase
        .from("linkedin_jobs")
        .select("id, created_at, title, company, url, note")
        .or(searchFilter(["company"], key))
        .limit(MATCH_LIMIT),
      supabase
        .from("headhunters")
        .select("id, created_at, title, company, url, note, proposal_sent")
        .or(searchFilter(["company", "title"], key))
        .limit(MATCH_LIMIT),
    ]);

  // The filters above find names containing the key; this page is the exact company.
  const same = (name: string | null) => companyKey(name ?? "") === key;
  const sent = (sentResult.data ?? []).filter((row) => same(row.company ?? row.to_email));
  const jobs = (jobsResult.data ?? []).filter((row) => same(row.company));
  const contacts = ((contactsResult.data ?? []) as CareerContact[]).filter(
    (row) => same(row.name) || same(row.organisation)
  );
  const saved = (savedResult.data ?? []).filter((row) => same(row.company));
  const recruiters = (headhuntersResult.data ?? []).filter((row) => recruiterKey(row) === key);
  const tracked = (tracking.data ?? null) as CompanyTracking | null;

  const replies = repliesResult.data ?? [];
  const company =
    tracked?.company ??
    sent[0]?.company ??
    sent[0]?.to_email ??
    jobs[0]?.company ??
    contacts[0]?.organisation ??
    contacts[0]?.name ??
    saved[0]?.company ??
    recruiters[0]?.company ??
    recruiters[0]?.title ??
    (replies.length ? key : undefined);
  if (!company) notFound();

  const emails = [...new Set([...sent.map((row) => row.to_email), ...contacts.map((row) => row.email)])].filter(
    Boolean
  );

  return (
    <section className="shell py-20 sm:py-28">
      <AdminNav />

      <Link
        href="/admin/linkedin"
        className="mt-10 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Applying for jobs
      </Link>
      <h1 className="page-title mt-3 text-2xl">{company}</h1>
      {emails.length > 0 && <p className="mt-1 text-sm text-ink-muted">{emails.join(", ")}</p>}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="lg:sticky lg:top-6">
          <CompanyTrackerCard
            company={company}
            status={tracked?.status ?? null}
            note={tracked?.note ?? ""}
            onSave={saveCompanyTracking}
          />
          {tracking.error && (
            <p className="mt-2 text-xs text-danger">
              Run supabase/company_tracking.sql in the Supabase SQL Editor to save a status and notes.
            </p>
          )}
        </div>

        <div className="grid gap-6">
          {replies.length > 0 && (
            <Section title={`Replies (${replies.length})`}>
              {replies.map((row) => (
                <div key={row.id} className="rounded-xl border border-black/10 bg-background p-3">
                  <p className="font-semibold">
                    {row.subject || "(no subject)"}
                    {row.is_auto && (
                      <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold">Automatic</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {line([row.from_name, row.from_email, shortDate(row.received_at)])}
                  </p>
                  {row.snippet && <p className="mt-2 whitespace-pre-wrap text-xs leading-5">{row.snippet}</p>}
                </div>
              ))}
            </Section>
          )}

          <Section title={`Messages sent (${sent.length})`}>
            {sent.length === 0 && <p className="text-xs text-ink-muted">None yet.</p>}
            {sent.map((row) => (
              <div key={row.id} className="rounded-xl border border-black/10 bg-background p-3">
                <p className="font-semibold">{row.subject}</p>
                <p className="text-xs text-ink-muted">
                  {line([
                    row.kind === "ad" ? "Job ad" : "Open application",
                    `to ${row.to_email}`,
                    shortDate(row.created_at),
                  ])}
                </p>
                <div className="mt-2">
                  <Letter summary="Show message" text={row.body} />
                </div>
              </div>
            ))}
          </Section>

          {jobs.length > 0 && (
            <Section title={`Job ads (${jobs.length})`}>
              {jobs.map((row) => (
                <div key={row.id} className="rounded-xl border border-black/10 bg-background p-3">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    {row.title} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <p className="text-xs capitalize text-ink-muted">
                    {line([
                      row.status,
                      row.location,
                      row.source,
                      `found ${shortDate(row.created_at)}`,
                      row.applied_at && `applied ${shortDate(row.applied_at)}`,
                    ])}
                  </p>
                  {row.cover_letter && (
                    <div className="mt-2">
                      <Letter summary="Show cover letter" text={row.cover_letter} />
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {contacts.length > 0 && (
            <Section title="In Recruiters & companies">
              {contacts.map((row) => (
                <div key={row.id} className="rounded-xl border border-black/10 bg-background p-3">
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-ink-muted">
                    {line([
                      careerKindLabels[row.kind],
                      careerStatusLabels[row.status],
                      row.coverage,
                      row.last_contacted_on && `last contacted ${row.last_contacted_on}`,
                    ])}
                  </p>
                  {row.specialisation && <p className="mt-1 text-xs">{row.specialisation}</p>}
                  {row.notes && <p className="mt-1 text-xs">{row.notes}</p>}
                  <div className="mt-1 flex flex-wrap gap-3 text-xs font-semibold">
                    {row.website && (
                      <a href={row.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Website
                      </a>
                    )}
                    {row.linkedin && (
                      <a href={row.linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {recruiters.length > 0 && (
            <Section title="Recruiters">
              {recruiters.map((row) => (
                <div key={row.id} className="rounded-xl border border-black/10 bg-background p-3">
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-ink-muted">
                    {line([row.company, row.proposal_sent ? "CV or message sent" : "Not contacted yet"])}
                  </p>
                  {row.note && <p className="mt-1 text-xs">{row.note}</p>}
                  {row.url && (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-semibold hover:underline"
                    >
                      Open
                    </a>
                  )}
                </div>
              ))}
            </Section>
          )}

          {saved.length > 0 && (
            <Section title="Saved jobs">
              {saved.map((row) => (
                <div key={row.id} className="rounded-xl border border-black/10 bg-background p-3">
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                    {row.title}
                  </a>
                  {row.note && <p className="mt-1 text-xs">{row.note}</p>}
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </section>
  );
}
