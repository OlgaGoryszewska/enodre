"use client";

import { useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { MOOD_OPTIONS, moodEmoji, moodLabel, type MoodEntry } from "@/lib/mood";
import type { JournalEntry } from "@/lib/journal";
import { saveMoodEntry } from "@/app/admin/dashboard/mood-actions";
import { saveJournalEntry } from "@/app/admin/dashboard/journal-actions";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion } from "@/components/admin/Accordion";
import { useAffirmation } from "@/components/admin/AffirmationToast";
import { cn } from "@/lib/utils";

interface MoodTrackerProps {
  entries: MoodEntry[];
  journalEntries: JournalEntry[];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function MoodTracker({ entries, journalEntries }: MoodTrackerProps) {
  const showAffirmation = useAffirmation();
  const todayEntry = entries.find((entry) => entry.entry_date === todayKey()) ?? null;
  const todayJournalEntry = journalEntries.find((entry) => entry.entry_date === todayKey()) ?? null;

  const [selectedMood, setSelectedMood] = useState<number | null>(todayEntry?.mood ?? null);
  const [savingMood, setSavingMood] = useState(false);

  const [journal, setJournal] = useState(todayJournalEntry?.entry ?? "");
  const [savingJournal, setSavingJournal] = useState(false);
  const journalDirty = journal !== (todayJournalEntry?.entry ?? "");

  async function handleSelectMood(mood: number) {
    const previousMood = selectedMood;
    setSelectedMood(mood);
    setSavingMood(true);
    try {
      const formData = new FormData();
      formData.set("mood", String(mood));
      await saveMoodEntry(formData);
      showAffirmation();
    } catch (error) {
      console.error("Failed to save mood:", error);
      setSelectedMood(previousMood);
    } finally {
      setSavingMood(false);
    }
  }

  async function handleSaveJournal() {
    setSavingJournal(true);
    try {
      const formData = new FormData();
      formData.set("entry", journal);
      await saveJournalEntry(formData);
      showAffirmation();
    } catch (error) {
      console.error("Failed to save journal entry:", error);
    } finally {
      setSavingJournal(false);
    }
  }

  const history = entries.filter((entry) => entry.entry_date !== todayKey()).slice(0, 6);

  return (
    <Accordion icon={<Brain className="h-4 w-4" aria-hidden="true" />} title="Mental health" subtitle="How are you feeling today?">
      <div className="flex flex-wrap gap-2">
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

      <div className="mt-6 border-t border-black/10 pt-6">
        <label htmlFor="journal" className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Journal
        </label>
        <Textarea
          id="journal"
          rows={5}
          value={journal}
          onChange={(event) => setJournal(event.target.value)}
          placeholder="Write today's entry..."
          className="mt-2"
        />
        {journalDirty && (
          <button
            type="button"
            onClick={handleSaveJournal}
            disabled={savingJournal}
            className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
          >
            {savingJournal ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              "Save journal entry"
            )}
          </button>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          Saved entries show up as a marker on today&apos;s date in the calendar.
        </p>
      </div>

      {history.length > 0 && (
        <div className="mt-6 border-t border-black/10 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Recent</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                title={moodLabel(entry.mood)}
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
    </Accordion>
  );
}
