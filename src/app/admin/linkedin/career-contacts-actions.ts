"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CAREER_KIND_VALUES, CAREER_STATUS_VALUES, type CareerContact } from "@/lib/career-contact";
import { findCompanyEmails } from "@/lib/email-discovery";
import { JOB_AGENT, loadCv } from "@/lib/job-agent";
import { careerApplication } from "@/lib/job-matching";
import { getGmailMailer } from "@/lib/mailer";
import { osloToday } from "@/lib/gtm-logic";
import { searchCompanies } from "@/lib/brreg";
import { careerCandidates, type AdRow, type AgencyRow, type CareerCandidate } from "@/lib/career-candidates";
import { displayCompanyName, titleCase } from "@/lib/opener-templates";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const contactSchema = z.object({
  kind: z.enum(CAREER_KIND_VALUES),
  name: z.string().trim().min(1, "Name is required.").max(200),
  organisation: text(200),
  linkedin: text(500),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((value) => value || null)
    .pipe(z.email("That doesn't look like a valid email address.").nullable())
    .nullable()
    .optional(),
  website: text(500),
  notes: text(2000),
});

export async function addCareerContact(input: z.input<typeof contactSchema>) {
  const values = contactSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("career_contacts").insert(values);
  if (error) throw new Error(error.code === "23505" ? "That contact is already in the list." : error.message);
  revalidatePath("/admin/linkedin");
}

const updateSchema = z.object({
  status: z.enum(CAREER_STATUS_VALUES).optional(),
  notes: text(2000),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((value) => value || null)
    .pipe(z.email().nullable())
    .nullable()
    .optional(),
  linkedin: text(500),
});

export async function updateCareerContact(id: string, input: z.input<typeof updateSchema>) {
  const values = updateSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("career_contacts")
    .update({
      ...values,
      // First outreach date, so follow-ups can be timed.
      ...(values.status === "contacted" ? { last_contacted_on: osloToday() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", z.uuid().parse(id));
  if (error) throw error;
  revalidatePath("/admin/linkedin");
}

export async function deleteCareerContact(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("career_contacts").delete().eq("id", z.uuid().parse(id));
  if (error) throw error;
  revalidatePath("/admin/linkedin");
}

// ---------------------------------------------------------------------------
// "Contact": find the address, show the exact email, send only on confirmation.

const PREPARE_PER_CLICK = 25;
const SEND_PER_CLICK = 25;
const TIME_BUDGET_MS = 220_000;
const ADDRESS_SEARCH_LIMIT_MS = 15_000;
const CAREERS_ADDRESS = /^(careers?|jobs?|jobb|recruit|talent|people|hr)\b/i;

export type PreparedContact = {
  id: string;
  name: string;
  to: string | null;
  subject: string;
  body: string;
  /** Why it can't be sent; null when it can. */
  problem: string | null;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return supabase;
}

async function companyAddress(contact: CareerContact) {
  // A job board's page says nothing about the company's own address.
  const website = contact.website && !/startup\.jobs/.test(contact.website) ? contact.website : null;
  const search = await Promise.race([
    findCompanyEmails({ website, companyName: contact.name }).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ADDRESS_SEARCH_LIMIT_MS)),
  ]);
  const usable = (search?.emails ?? []).filter((item) => item.generic);
  return (usable.find((item) => CAREERS_ADDRESS.test(item.email)) ?? usable[0])?.email ?? null;
}

async function alreadySent(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.from("job_applications_sent").select("to_email");
  if (error) throw new Error("Run job_agent.sql again: the sent-applications log is missing.");
  return new Set((data ?? []).map((row) => (row.to_email as string).toLowerCase()));
}

/** Preview: finds each address and writes each email. Sends nothing. */
export async function prepareCareerContacts(ids: string[]): Promise<{ items: PreparedContact[]; more: number }> {
  const supabase = await requireAdmin();
  const wanted = z.array(z.uuid()).parse(ids);
  const { data, error } = await supabase
    .from("career_contacts")
    .select("*")
    .in("id", wanted.slice(0, PREPARE_PER_CLICK))
    .eq("status", "to_contact");
  if (error) throw error;
  const sent = await alreadySent(supabase);
  const started = Date.now();
  const queue = (data ?? []) as CareerContact[];
  const items: PreparedContact[] = [];
  while (queue.length > 0 && Date.now() - started < TIME_BUDGET_MS) {
    const batch = queue.splice(0, 5);
    items.push(
      ...(await Promise.all(
        batch.map(async (contact) => {
          const to = contact.email ?? (contact.kind === "recruiter" ? null : await companyAddress(contact));
          if (to && !contact.email) {
            await supabase.from("career_contacts").update({ email: to }).eq("id", contact.id);
          }
          const letter = careerApplication(contact);
          return {
            id: contact.id,
            name: contact.name,
            to,
            ...letter,
            problem: !to
              ? contact.kind === "recruiter"
                ? "No email saved: message them on LinkedIn"
                : "No general address found: use their careers page or LinkedIn"
              : sent.has(to.toLowerCase())
                ? "Already sent an application to this address"
                : null,
          };
        })
      ))
    );
  }
  return { items, more: Math.max(0, wanted.length - PREPARE_PER_CLICK) + queue.length };
}

/** Sends to contacts prepared above. One per address, ever; logged before it goes out. */
export async function sendCareerContacts(ids: string[]) {
  const supabase = await requireAdmin();
  const mailer = getGmailMailer();
  if (!mailer) throw new Error("Gmail isn't set up (GMAIL_USER / GMAIL_APP_PASSWORD).");
  const cv = await loadCv(supabase);
  if (!cv) throw new Error("Upload your CV first (Job agent → Upload CV).");
  const { data, error } = await supabase
    .from("career_contacts")
    .select("*")
    .in("id", z.array(z.uuid()).parse(ids).slice(0, SEND_PER_CLICK))
    .eq("status", "to_contact");
  if (error) throw error;
  const sent = await alreadySent(supabase);
  const started = Date.now();
  const results: { name: string; to: string | null; ok: boolean; detail: string }[] = [];
  for (const contact of (data ?? []) as CareerContact[]) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      results.push({ name: contact.name, to: contact.email, ok: false, detail: "Time limit: send again" });
      continue;
    }
    const to = contact.email?.toLowerCase() ?? null;
    if (!to || sent.has(to)) {
      results.push({ name: contact.name, to, ok: false, detail: to ? "Already sent" : "No address" });
      continue;
    }
    const letter = careerApplication(contact);
    const { data: logged, error: logError } = await supabase
      .from("job_applications_sent")
      .insert({
        kind: "open",
        company: contact.name,
        to_email: to,
        subject: letter.subject,
        body: letter.body,
        attachment: JOB_AGENT.cvFileName,
      })
      .select("id")
      .single();
    if (logError || !logged) {
      results.push({ name: contact.name, to, ok: false, detail: "Already sent" });
      continue;
    }
    try {
      await mailer.transporter.sendMail({
        from: `"Olga Goryszewska" <${mailer.address}>`,
        to,
        subject: letter.subject,
        text: letter.body,
        attachments: [{ filename: JOB_AGENT.cvFileName, content: cv, contentType: "application/pdf" }],
      });
    } catch (sendError) {
      await supabase.from("job_applications_sent").delete().eq("id", logged.id);
      const detail = sendError instanceof Error ? sendError.message : "Send failed";
      results.push({ name: contact.name, to, ok: false, detail });
      continue;
    }
    sent.add(to);
    await supabase
      .from("career_contacts")
      .update({ status: "contacted", last_contacted_on: osloToday(), updated_at: new Date().toISOString() })
      .eq("id", contact.id);
    results.push({ name: contact.name, to, ok: true, detail: "Sent" });
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  revalidatePath("/admin/linkedin");
  return results;
}

// ---------------------------------------------------------------------------
// Finding new people to contact: a preview first, then you choose who to add.

const LOOKBACK_DAYS = 30;

export type FindCandidatesResult =
  { ok: true; candidates: CareerCandidate[]; sources: string[] } | { ok: false; error: string };

/**
 * Companies hiring for your role in the job agent's ads, the recruiters
 * posting those ads, and tech recruiters in Oslo and Bergen from the register.
 * Nothing is saved: the preview shows them, you pick.
 */
export async function findCareerCandidates(): Promise<FindCandidatesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const [ads, contacts, sent] = await Promise.all([
    supabase
      .from("job_postings")
      .select("company, title, city, snippet, score, url")
      .gte("created_at", since)
      .not("company", "is", null)
      .order("score", { ascending: false })
      .limit(400),
    supabase.from("career_contacts").select("name, organisation"),
    supabase.from("job_applications_sent").select("company").not("company", "is", null),
  ]);
  const sources: string[] = [];
  if (ads.error) sources.push("Couldn't read the job agent's ads.");
  else sources.push(`${ads.data.length} ads from the last ${LOOKBACK_DAYS} days`);

  let agencies: AgencyRow[] = [];
  try {
    const { companies } = await searchCompanies({
      industryCodes: ["78.100", "78.200"],
      municipalityNumbers: ["0301", "4601"], // Oslo, Bergen
      // The register won't search below five employees (privacy).
      minEmployees: 5,
      maxEmployees: 1000,
      limit: 300,
      exclude: new Set(),
    });
    agencies = companies.map((company) => ({
      name: company.name,
      website: company.website,
      municipality: company.municipality ? titleCase(company.municipality) : null,
      employees: company.employees,
    }));
    sources.push(`${companies.length} recruitment and staffing firms in Oslo and Bergen`);
  } catch (error) {
    console.error("Register search for recruiters failed:", error);
    sources.push("The company register didn't answer, so no agencies from it this time.");
  }

  const candidates = careerCandidates({
    ads: (ads.data ?? []) as AdRow[],
    agencies,
    existing: (contacts.data ?? []).flatMap((row) => [row.name, row.organisation].filter(Boolean) as string[]),
    appliedTo: (sent.data ?? []).map((row) => row.company as string),
  }).map((candidate) => ({
    ...candidate,
    name: candidate.name === candidate.name.toUpperCase() ? displayCompanyName(candidate.name) : candidate.name,
  }));
  return { ok: true, candidates, sources };
}

const candidateSchema = z.object({
  kind: z.enum(["agency", "company"]),
  name: z.string().trim().min(1).max(200),
  website: z.string().trim().max(500).nullable(),
  coverage: z.string().trim().max(200).nullable(),
  reason: z.string().trim().max(1000),
  industry: z.enum(["HealthTech", "BeautyTech"]).nullable(),
  fit: z.enum(["high", "medium"]),
  linkedin: z.string().trim().max(500),
});

/** Adds the candidates you ticked, as "To contact". Ones already there are skipped. */
export async function addCareerCandidates(input: z.input<typeof candidateSchema>[]) {
  const values = z.array(candidateSchema).max(100).parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_contacts")
    .upsert(
      values.map((candidate) => ({
        kind: candidate.kind,
        name: candidate.name,
        website: candidate.website
          ? candidate.website.startsWith("http")
            ? candidate.website
            : `https://${candidate.website}`
          : null,
        coverage: candidate.coverage,
        specialisation: candidate.reason,
        industry: candidate.industry,
        fit: candidate.fit,
        linkedin: candidate.linkedin,
        status: "to_contact",
      })),
      { onConflict: "kind,name", ignoreDuplicates: true }
    )
    .select("id");
  if (error) {
    console.error("Adding career candidates failed:", error.message);
    return { ok: false as const, error: "Couldn't add them. Try again." };
  }
  revalidatePath("/admin/linkedin");
  return { ok: true as const, added: data?.length ?? 0 };
}
