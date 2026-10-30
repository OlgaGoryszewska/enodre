"use client";

import { useState } from "react";
import { Check, ClipboardList, Copy, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FIXED_DETAILS, PROFILE_FIELDS, type JobProfile } from "@/lib/job-profile";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      aria-label={`Copy ${label}`}
      onClick={() =>
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined)
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        copied ? "border-[#1B8A3A] text-[#1B8A3A]" : "border-black/10 hover:border-black/30",
        !text && "opacity-40"
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Everything an application form asks for, one click to copy each. */
export function ApplicationDetails({
  profile,
  onSave,
}: {
  profile: JobProfile;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [values, setValues] = useState<JobProfile>(profile);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(key: string) {
    if ((values[key] ?? "") === (profile[key] ?? "")) return;
    setSaving(key);
    setError(null);
    try {
      await onSave(key, values[key] ?? "");
      setSaved(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(null);
    }
  }

  const missing = PROFILE_FIELDS.filter((field) => !(values[field.key] ?? "").trim()).length;

  return (
    <details className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
        <ClipboardList className="h-5 w-5 text-accent" aria-hidden="true" />
        My details for application forms
        {missing > 0 && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
            {missing} answer{missing === 1 ? "" : "s"} to fill in
          </span>
        )}
      </summary>
      <p className="mt-2 text-sm text-ink-muted">
        Copy each field into the form. The cover letter for each job is under its “Cover letter” button.
      </p>

      <ul className="mt-4 grid gap-1.5">
        {FIXED_DETAILS.map((detail) => (
          <li
            key={detail.label}
            className="flex items-center gap-3 rounded-xl border border-black/10 bg-background px-3 py-2 text-sm"
          >
            <span className="w-36 shrink-0 text-xs text-ink-muted">{detail.label}</span>
            <span className="min-w-0 flex-1 break-words">{detail.value}</span>
            <CopyButton text={detail.value} label={detail.label} />
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-sm font-semibold">Your answers</h3>
      <p className="text-xs text-ink-muted">
        Not in the CV — fill them in once; they save when you click outside the box.
      </p>
      <ul className="mt-2 grid gap-2">
        {PROFILE_FIELDS.map((field) => (
          <li key={field.key} className="grid gap-1.5 rounded-xl border border-black/10 bg-background p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`profile-${field.key}`} className="text-xs font-semibold">
                {field.label}
              </label>
              <div className="flex items-center gap-2">
                {saving === field.key && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {saved === field.key && saving !== field.key && <span className="text-xs text-ink-muted">Saved</span>}
                <CopyButton text={values[field.key] ?? ""} label={field.label} />
              </div>
            </div>
            <Textarea
              id={`profile-${field.key}`}
              rows={field.key === "why_me" ? 3 : 1}
              placeholder={field.hint}
              value={values[field.key] ?? ""}
              onChange={(event) => {
                setSaved(null);
                setValues((current) => ({ ...current, [field.key]: event.target.value }));
              }}
              onBlur={() => void save(field.key)}
            />
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </details>
  );
}
