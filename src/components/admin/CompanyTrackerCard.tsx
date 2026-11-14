"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { COMPANY_STATUS_VALUES, companyStatusLabels, type CompanyStatus } from "@/lib/application-search";

/** Your status and sticky note for one company. */
export function CompanyTrackerCard({
  company,
  status: savedStatus,
  note: savedNote,
  onSave,
}: {
  company: string;
  status: CompanyStatus | null;
  note: string;
  onSave: (input: {
    company: string;
    status: CompanyStatus | null;
    note: string;
  }) => Promise<{ ok: boolean; error: string | null }>;
}) {
  const [status, setStatus] = useState(savedStatus);
  const [note, setNote] = useState(savedNote);
  const [saved, setSaved] = useState({ status: savedStatus, note: savedNote });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = status !== saved.status || note !== saved.note;

  function save(next: { status: CompanyStatus | null; note: string }) {
    setError(null);
    startTransition(async () => {
      const result = await onSave({ company, ...next }).catch(() => ({ ok: false, error: "Couldn't save." }));
      if (result.ok) setSaved(next);
      else setError(result.error);
    });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-[#E8D48A] bg-[#FFF8DC] p-5 text-[#3D3000] shadow-sm">
      <label className="grid gap-1 text-xs font-semibold">
        Status
        <select
          value={status ?? ""}
          onChange={(event) => {
            const next = (event.target.value || null) as CompanyStatus | null;
            setStatus(next);
            save({ status: next, note });
          }}
          className="h-10 rounded-xl border border-[#E8D48A] bg-white px-3 text-sm font-normal"
        >
          <option value="">Not set</option>
          {COMPANY_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {companyStatusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Sticky note
        <Textarea
          rows={6}
          value={note}
          maxLength={5000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What they said, who to talk to, what to do next"
          className="border-[#E8D48A] bg-transparent font-normal"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !changed}
          onClick={() => save({ status, note })}
          className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save
        </button>
        {!changed && !pending && !error && (saved.status || saved.note) && (
          <span className="inline-flex items-center gap-1 text-xs">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved
          </span>
        )}
        {error && <span className="text-xs font-semibold text-danger">{error}</span>}
      </div>
    </div>
  );
}
