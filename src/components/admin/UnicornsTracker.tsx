"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { MAX_UNICORNS_PER_DAY, type UnicornEntry } from "@/lib/unicorn";
import { addUnicorn, removeUnicorn } from "@/app/admin/dashboard/unicorn-actions";

interface UnicornsTrackerProps {
  entryDate: string;
  todayEntry: UnicornEntry | null;
}

// A tiny "collect them all" game: today starts with 6 empty slots, and
// sending an Upwork proposal fills one in with the client's name — replaces
// the old full Upwork admin section, which had gone unused.
export function UnicornsTracker({ entryDate, todayEntry }: UnicornsTrackerProps) {
  const [companies, setCompanies] = useState(todayEntry?.companies ?? []);
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const slots = Array.from({ length: MAX_UNICORNS_PER_DAY }, (_, i) => companies[i] ?? null);

  function handleAdd() {
    const value = draft.trim();
    setAddingAt(null);
    setDraft("");
    if (!value) return;

    setCompanies((current) => [...current, value]);
    startTransition(async () => {
      try {
        await addUnicorn(entryDate, value);
      } catch (error) {
        console.error("Failed to add unicorn:", error);
        setCompanies((current) => current.slice(0, -1));
      }
    });
  }

  function handleRemove(index: number) {
    const previous = companies;
    setCompanies((current) => current.filter((_, i) => i !== index));
    startTransition(async () => {
      try {
        await removeUnicorn(entryDate, index);
      } catch (error) {
        console.error("Failed to remove unicorn:", error);
        setCompanies(previous);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-lg"
          aria-hidden="true"
        >
          🦄
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Today&apos;s unicorns</h2>
          <p className="text-sm text-ink-muted">
            {companies.length} of {MAX_UNICORNS_PER_DAY} caught — one per proposal sent
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {slots.map((company, index) => {
          if (company) {
            return (
              <div
                key={index}
                className="group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-accent/30 bg-accent/10 p-2 text-center"
              >
                <span className="text-xl" aria-hidden="true">
                  🦄
                </span>
                <span className="line-clamp-2 text-xs font-medium leading-tight">{company}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove ${company}`}
                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-background text-ink-muted transition hover:text-danger group-hover:flex"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            );
          }

          if (addingAt === index) {
            return (
              <form
                key={index}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAdd();
                }}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-accent/40 bg-background p-2"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={handleAdd}
                  placeholder="Client name"
                  className="w-full rounded-md border border-black/10 bg-background px-1.5 py-1 text-center text-xs outline-none focus:border-accent"
                />
              </form>
            );
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                setAddingAt(index);
                setDraft("");
              }}
              disabled={isPending}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/15 text-ink-muted transition hover:border-accent/40 hover:text-accent disabled:opacity-60"
            >
              <span className="text-xl opacity-30" aria-hidden="true">
                🦄
              </span>
              <span className="text-[10px] font-medium">Add</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
