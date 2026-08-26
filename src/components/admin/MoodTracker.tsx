"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MOOD_OPTIONS, moodEmoji, moodLabel, type MoodEntry } from "@/lib/mood";
import { saveMoodEntry } from "@/app/admin/dashboard/mood-actions";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MoodTrackerProps {
  entries: MoodEntry[];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function MoodTracker({ entries }: MoodTrackerProps) {
  const todayEntry = entries.find((entry) => entry.entry_date === todayKey()) ?? null;
  const [selectedMood, setSelectedMood] = useState<number | null>(todayEntry?.mood ?? null);
  const [note, setNote] = useState(todayEntry?.note ?? "");
  const [savingMood, setSavingMood] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  async function persist(mood: number, noteValue: string) {
    const formData = new FormData();
    formData.set("mood", String(mood));
    formData.set("note", noteValue);
    await saveMoodEntry(formData);
  }

  async function handleSelectMood(mood: number) {
    const previousMood = selectedMood;
    setSelectedMood(mood);
    setSavingMood(true);
    try {
      await persist(mood, note);
    } catch (error) {
      console.error("Failed to save mood:", error);
      setSelectedMood(previousMood);
    } finally {
      setSavingMood(false);
    }
  }

  async function handleSaveNote() {
    if (!selectedMood) return;
    setSavingNote(true);
    try {
      await persist(selectedMood, note);
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setSavingNote(false);
    }
  }

  const history = entries.filter((entry) => entry.entry_date !== todayKey()).slice(0, 6);

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Mental health</h2>
      <p className="mt-1 text-sm text-ink-muted">How are you feeling today?</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {MOOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelectMood(option.value)}
            disabled={savingMood}
            aria-pressed={selectedMood === option.value}
            title={option.label}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl transition disabled:opacity-60",
              selectedMood === option.value
                ? "border-accent bg-accent/10"
                : "border-black/10 hover:border-black/25"
            )}
          >
            {option.emoji}
          </button>
        ))}
      </div>

      {selectedMood && (
        <div className="mt-5">
          <label
            htmlFor="mood-note"
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
          >
            Note (optional)
          </label>
          <Textarea
            id="mood-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What's on your mind?"
            className="mt-2"
          />
          <button
            type="button"
            onClick={handleSaveNote}
            disabled={savingNote}
            className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
          >
            {savingNote ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save note"}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 border-t border-black/10 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Recent</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                title={entry.note ?? moodLabel(entry.mood)}
                className="flex flex-col items-center gap-1 text-center"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-background text-xl">
                  {moodEmoji(entry.mood)}
                </span>
                <span className="text-[11px] text-ink-muted">
                  {new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
