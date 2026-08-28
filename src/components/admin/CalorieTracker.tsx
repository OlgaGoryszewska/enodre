"use client";

import { useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import type { CalorieEntry } from "@/lib/calorie";
import { saveCalorieEntry } from "@/app/admin/dashboard/calorie-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalorieTrackerProps {
  entries: CalorieEntry[];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function CalorieTracker({ entries }: CalorieTrackerProps) {
  const todayEntry = entries.find((entry) => entry.entry_date === todayKey()) ?? null;

  const [calories, setCalories] = useState(todayEntry?.calories?.toString() ?? "");
  const [note, setNote] = useState(todayEntry?.note ?? "");
  const [saving, setSaving] = useState(false);

  const dirty =
    calories !== (todayEntry?.calories?.toString() ?? "") || note !== (todayEntry?.note ?? "");

  async function handleSave() {
    if (!calories) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("calories", calories);
      formData.set("note", note);
      await saveCalorieEntry(formData);
    } catch (error) {
      console.error("Failed to save calorie entry:", error);
    } finally {
      setSaving(false);
    }
  }

  const history = entries.filter((entry) => entry.entry_date !== todayKey()).slice(0, 7);

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">Calorie count</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Log today&apos;s intake</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="calories" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Calories
          </label>
          <Input
            id="calories"
            type="number"
            min={0}
            inputMode="numeric"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            placeholder="2000"
            className="mt-2"
          />
        </div>
        <div>
          <label htmlFor="calorie-note" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Note (optional)
          </label>
          <Textarea
            id="calorie-note"
            rows={1}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What did you eat?"
            className="mt-2"
          />
        </div>
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !calories}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save"}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-6 border-t border-black/10 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Recent</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                title={entry.note ?? undefined}
                className="rounded-xl border border-black/10 bg-background px-3 py-2 text-center"
              >
                <p className="text-sm font-medium">{entry.calories.toLocaleString()}</p>
                <p className="text-[11px] text-ink-muted">
                  {new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
