"use client";

import { useState } from "react";
import Link from "next/link";
import { AlarmClock, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriorityTask } from "@/lib/gtm-dashboard";

interface TodayPrioritiesProps {
  tasks: PriorityTask[];
  onSnooze: (leadId: string, businessDays: number) => Promise<void>;
  onClear: (leadId: string) => Promise<void>;
}

/** Today's priorities — derived from the database on every load, most urgent first. */
export function TodayPriorities({ tasks, onSnooze, onClear }: TodayPrioritiesProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setError(null);
    try {
      await action();
    } catch {
      setError("Couldn't update that task. Has gtm_command_centre.sql been run in Supabase?");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Today&apos;s priorities</h2>
        <p className="text-sm text-ink-muted">
          {tasks.length === 0
            ? "Nothing urgent — find or research new companies."
            : `${tasks.length} to do, most urgent first`}
        </p>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {tasks.length > 0 && (
        <ol className="mt-5 grid gap-2">
          {tasks.map((task) => (
            <li
              key={task.key}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border bg-background px-4 py-3",
                task.urgent ? "border-danger/40" : "border-black/10"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", task.urgent && "text-danger")}>{task.title}</p>
                <p className="text-xs text-ink-muted">{task.detail}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {task.canSnooze && task.leadId && (
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => void run(task.key, () => onSnooze(task.leadId!, 2))}
                    title="Move this follow-up two business days later"
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-black/25 hover:text-foreground"
                  >
                    {busyKey === task.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <AlarmClock className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Snooze 2 days
                  </button>
                )}
                {task.canClear && task.leadId && (
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => void run(task.key, () => onClear(task.leadId!))}
                    title="No follow-up needed for this lead"
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-black/25 hover:text-foreground"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Not needed
                  </button>
                )}
                <Link
                  href={task.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
                >
                  Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
