"use client";

import { useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import type { CalorieEntry } from "@/lib/calorie";
import { saveCalorieEntry } from "@/app/admin/dashboard/calorie-actions";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Accordion } from "@/components/admin/Accordion";
import { useAffirmation } from "@/components/admin/AffirmationToast";
import { cn } from "@/lib/utils";

interface CalorieTrackerProps {
  entries: CalorieEntry[];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function CalorieTracker({ entries }: CalorieTrackerProps) {
  const showAffirmation = useAffirmation();
  const todayEntry = entries.find((entry) => entry.entry_date === todayKey()) ?? null;

  const [calories, setCalories] = useState(todayEntry?.calories?.toString() ?? "");
  const [caloriesBurned, setCaloriesBurned] = useState(todayEntry?.calories_burned?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const dirty =
    calories !== (todayEntry?.calories?.toString() ?? "") ||
    caloriesBurned !== (todayEntry?.calories_burned?.toString() ?? "");

  async function handleSave() {
    if (!calories) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("calories", calories);
      formData.set("caloriesBurned", caloriesBurned);
      await saveCalorieEntry(formData);
      showAffirmation();
    } catch (error) {
      console.error("Failed to save calorie entry:", error);
    } finally {
      setSaving(false);
    }
  }

  const history = entries.filter((entry) => entry.entry_date !== todayKey()).slice(0, 7);

  return (
    <Accordion icon={<Flame className="h-4 w-4" aria-hidden="true" />} title="Calorie count" subtitle="Log today's intake">
      <div className="grid gap-3 sm:grid-cols-[160px_160px_auto] sm:items-end">
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
          <label htmlFor="calories-burned" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Burned (optional)
          </label>
          <Input
            id="calories-burned"
            type="number"
            min={0}
            inputMode="numeric"
            value={caloriesBurned}
            onChange={(event) => setCaloriesBurned(event.target.value)}
            placeholder="From Garmin"
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
                className="rounded-xl border border-black/10 bg-background px-3 py-2 text-center"
              >
                <p className="text-sm font-medium">{entry.calories.toLocaleString()}</p>
                {entry.calories_burned != null && (
                  <p className="text-[11px] text-ink-muted">−{entry.calories_burned.toLocaleString()} burned</p>
                )}
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
    </Accordion>
  );
}
