"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LetterResult } from "@/app/admin/linkedin/job-agent-actions";

type Written = Extract<LetterResult, { ok: true }>;

/** Give a company name; Claude researches it and writes a letter in Olga's voice. */
export function LetterPersonaliser({
  onWrite,
}: {
  onWrite: (input: { company: string; role: string; adText: string; language: "en" | "no" }) => Promise<LetterResult>;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [adText, setAdText] = useState("");
  const [language, setLanguage] = useState<"en" | "no">("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Written | null>(null);
  const [letter, setLetter] = useState("");
  const [copied, setCopied] = useState(false);

  async function write() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const written = await onWrite({ company, role, adText, language });
      if (!written.ok) {
        setError(written.error);
        return;
      }
      setResult(written);
      setLetter(written.letter);
    } catch {
      setError("Couldn't write the letter. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3 rounded-xl border border-black/10 bg-background p-4 text-sm">
      <div>
        <h3 className="font-semibold">Personalise a letter</h3>
        <p className="text-xs text-ink-muted">
          Give a company name. Claude reads about the company and writes a letter in the style of your example.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          aria-label="Company"
          placeholder="Company name or website"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
        <Input
          aria-label="Role"
          placeholder="Role (optional)"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        <select
          aria-label="Language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as "en" | "no")}
          className="rounded-xl border border-black/10 bg-background px-3"
        >
          <option value="en">English</option>
          <option value="no">Norwegian</option>
        </select>
      </div>
      <Textarea
        aria-label="Job ad"
        rows={3}
        placeholder="Paste the job ad (optional, makes the letter better)"
        value={adText}
        onChange={(event) => setAdText(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !company.trim()}
          onClick={() => void write()}
          className={cn(buttonVariants({ variant: "primary" }), "bg-foreground px-4 py-2 text-sm")}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? "Researching, about a minute…" : "Write letter"}
        </button>
        {error && <span className="text-sm font-semibold text-danger">{error}</span>}
      </div>

      {result && (
        <div className="grid gap-2">
          <Textarea
            aria-label="Your letter"
            rows={18}
            value={letter}
            onChange={(event) => setLetter(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard
                  .writeText(letter)
                  .then(() => setCopied(true))
                  .catch(() => undefined)
              }
              className="inline-flex items-center gap-1 font-semibold hover:underline"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy letter"}
            </button>
            <span className="text-ink-muted">
              Cost about ${result.costUsd.toFixed(2)}. Not saved: copy it to keep it.
            </span>
          </div>
          {result.caveat && <p className="text-xs font-semibold text-danger">Check before sending: {result.caveat}</p>}
          {result.facts.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-ink-muted">
                What it found ({result.facts.length})
              </summary>
              <ul className="mt-2 grid gap-1">
                {result.facts.map((item) => (
                  <li key={item.fact}>
                    {item.fact}{" "}
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold hover:underline"
                    >
                      Source
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
