"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { jobLeadFormSchema, type JobLeadFormValues } from "@/lib/job-lead-schema";
import type { JobLead } from "@/lib/job-lead";

interface JobLeadsCardProps {
  icon: ReactNode;
  heading: string;
  subtitle: string;
  companyLabel: string;
  jobs: JobLead[];
  onAdd: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetProposalSent: (id: string, proposalSent: boolean) => Promise<void>;
  onUpdateNote: (id: string, note: string) => Promise<void>;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobLeadsCard({
  icon,
  heading,
  subtitle,
  companyLabel,
  jobs: initialJobs,
  onAdd,
  onDelete,
  onSetProposalSent,
  onUpdateNote,
}: JobLeadsCardProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JobLeadFormValues>({
    resolver: zodResolver(jobLeadFormSchema),
    defaultValues: { title: "", company: "", url: "" },
  });

  async function onSubmit(values: JobLeadFormValues) {
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("company", values.company ?? "");
    formData.set("url", values.url);
    await onAdd(formData);

    setJobs((current) => [
      {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        title: values.title,
        company: values.company || null,
        url: values.url,
        proposal_sent: false,
        note: null,
      },
      ...current,
    ]);
    reset();
    setAddOpen(false);
  }

  async function handleDelete(id: string) {
    const previousJobs = jobs;
    setDeletingId(id);
    setJobs((current) => current.filter((job) => job.id !== id));
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete job:", error);
      setJobs(previousJobs);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleProposalSent(id: string, proposalSent: boolean) {
    const previousJobs = jobs;
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, proposal_sent: proposalSent } : job))
    );
    try {
      await onSetProposalSent(id, proposalSent);
    } catch (error) {
      console.error("Failed to update proposal status:", error);
      setJobs(previousJobs);
    }
  }

  return (
    <div className="min-w-0 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <button type="button" className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add job
            </button>
          </DialogTrigger>
          <DialogContent open={addOpen}>
            <DialogTitle className="text-lg font-semibold tracking-tight">Add job</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-muted">
              Paste in a match you find worth tracking
            </DialogDescription>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
              <FormField id={`${heading}-title`} label="Title" required error={errors.title?.message}>
                <Input id={`${heading}-title`} placeholder="Product Designer" {...register("title")} />
              </FormField>
              <FormField id={`${heading}-company`} label={companyLabel} error={errors.company?.message}>
                <Input id={`${heading}-company`} placeholder="Acme Inc." {...register("company")} />
              </FormField>
              <FormField id={`${heading}-url`} label="URL" required error={errors.url?.message}>
                <Input id={`${heading}-url`} placeholder="https://..." {...register("url")} />
              </FormField>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(buttonVariants({ variant: "primary" }), "mt-1 w-full")}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  "Add job"
                )}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {jobs.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="py-2 pr-4 font-semibold">Job</th>
                <th className="py-2 pr-4 font-semibold">Added</th>
                <th className="py-2 pr-4 font-semibold">Proposal</th>
                <th className="py-2 pr-4 font-semibold">Note</th>
                <th className="py-2 pl-4 text-right font-semibold">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {jobs.map((job) => (
                <JobLeadRow
                  key={job.id}
                  job={job}
                  deleting={deletingId === job.id}
                  onDelete={() => handleDelete(job.id)}
                  onToggleProposalSent={(value) => handleToggleProposalSent(job.id, value)}
                  onUpdateNote={(note) => onUpdateNote(job.id, note)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">No jobs added yet.</p>
      )}
    </div>
  );
}

interface JobLeadRowProps {
  job: JobLead;
  deleting: boolean;
  onDelete: () => void;
  onToggleProposalSent: (proposalSent: boolean) => void;
  onUpdateNote: (note: string) => Promise<void>;
}

function JobLeadRow({ job, deleting, onDelete, onToggleProposalSent, onUpdateNote }: JobLeadRowProps) {
  const [note, setNote] = useState(job.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const noteDirty = note !== (job.note ?? "");

  async function handleSaveNote() {
    setSavingNote(true);
    try {
      await onUpdateNote(note);
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <tr className="align-top">
      <td className="py-3 pr-4">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1.5"
        >
          <span className="font-medium transition group-hover:text-accent">{job.title}</span>
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-ink-muted transition group-hover:text-accent"
            aria-hidden="true"
          />
        </a>
        {job.company && <p className="mt-0.5 text-xs text-ink-muted">{job.company}</p>}
      </td>
      <td className="whitespace-nowrap py-3 pr-4 text-ink-muted">{formatDate(job.created_at)}</td>
      <td className="py-3 pr-4">
        <button
          type="button"
          onClick={() => onToggleProposalSent(!job.proposal_sent)}
          aria-pressed={job.proposal_sent}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition",
            job.proposal_sent
              ? "border-accent bg-accent/10 text-accent"
              : "border-black/10 text-ink-muted hover:border-black/25"
          )}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {job.proposal_sent ? "Sent" : "Not sent"}
        </button>
      </td>
      <td className="py-3 pr-4">
        <div className="flex min-w-[200px] items-center gap-2">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note..."
            className="text-sm"
          />
          {noteDirty && (
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={savingNote}
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0 px-4 py-2 text-sm")}
            >
              {savingNote ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                "Save"
              )}
            </button>
          )}
        </div>
      </td>
      <td className="py-3 pl-4 text-right">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Remove ${job.title}`}
          className="text-ink-muted transition hover:text-danger disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}
