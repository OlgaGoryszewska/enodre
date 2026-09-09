"use client";

import { useState, useTransition } from "react";
import { MAX_UNICORNS_PER_DAY, type UnicornEntry } from "@/lib/unicorn";
import { incrementUnicorns, decrementUnicorns } from "@/app/admin/dashboard/unicorn-actions";

interface UnicornsTrackerProps {
  entryDate: string;
  todayEntry: UnicornEntry | null;
}

// A tiny tally counter — click an empty slot each time you send an Upwork
// proposal, click a filled one to undo. Pure count, no names stored.
export function UnicornsTracker({ entryDate, todayEntry }: UnicornsTrackerProps) {
  const [count, setCount] = useState(todayEntry?.count ?? 0);
  const [isPending, startTransition] = useTransition();

  function handleIncrement() {
    if (count >= MAX_UNICORNS_PER_DAY) return;
    setCount((current) => current + 1);
    startTransition(async () => {
      try {
        await incrementUnicorns(entryDate);
      } catch (error) {
        console.error("Failed to add a proposal:", error);
        setCount((current) => current - 1);
      }
    });
  }

  function handleDecrement() {
    if (count <= 0) return;
    setCount((current) => current - 1);
    startTransition(async () => {
      try {
        await decrementUnicorns(entryDate);
      } catch (error) {
        console.error("Failed to remove a proposal:", error);
        setCount((current) => current + 1);
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
          <h2 className="text-lg font-semibold tracking-tight">Upwork proposals counter</h2>
          <p className="text-sm text-ink-muted">
            {count} of {MAX_UNICORNS_PER_DAY} sent today
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: MAX_UNICORNS_PER_DAY }, (_, index) => {
          const filled = index < count;
          return (
            <button
              key={index}
              type="button"
              onClick={filled ? handleDecrement : handleIncrement}
              disabled={isPending}
              aria-label={filled ? "Remove a sent proposal" : "Log a sent proposal"}
              className={
                filled
                  ? "flex h-10 w-10 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-base transition hover:opacity-70 disabled:opacity-60"
                  : "flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-black/15 text-base opacity-30 transition hover:border-accent/40 hover:opacity-60 disabled:opacity-20"
              }
            >
              🦄
            </button>
          );
        })}
      </div>
    </div>
  );
}
