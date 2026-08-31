"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MoreVertical, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addCustomerJournalEntry,
  deleteCustomerJournalEntry,
  updateCustomerJournalEntry,
} from "@/app/admin/people/journal-actions";
import type { CustomerJournalEntry } from "@/lib/customer-journal";

interface CustomerJournalProps {
  customerId: string;
  initialEntries: CustomerJournalEntry[];
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function sortByCreatedAtDesc(entries: CustomerJournalEntry[]) {
  return [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function CustomerJournal({ customerId, initialEntries }: CustomerJournalProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [draft, setDraft] = useState("");
  const [draftTime, setDraftTime] = useState(() => toDatetimeLocalValue(new Date().toISOString()));
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const content = draft.trim();
    if (!content) return;
    setAdding(true);
    try {
      const createdAt = new Date(draftTime).toISOString();
      const entry = await addCustomerJournalEntry(customerId, content, createdAt);
      setEntries((current) => sortByCreatedAtDesc([entry, ...current]));
      setDraft("");
      setDraftTime(toDatetimeLocalValue(new Date().toISOString()));
    } catch (error) {
      console.error("Failed to add journal entry:", error);
    } finally {
      setAdding(false);
    }
  }

  async function handleSave(entryId: string, content: string, createdAt: string) {
    const previous = entries;
    setEntries((current) =>
      sortByCreatedAtDesc(current.map((e) => (e.id === entryId ? { ...e, content, created_at: createdAt } : e)))
    );
    try {
      await updateCustomerJournalEntry(customerId, entryId, content, createdAt);
    } catch (error) {
      console.error("Failed to save journal entry:", error);
      setEntries(previous);
    }
  }

  async function handleDelete(entryId: string) {
    const previous = entries;
    setEntries((current) => current.filter((e) => e.id !== entryId));
    try {
      await deleteCustomerJournalEntry(customerId, entryId);
    } catch (error) {
      console.error("Failed to delete journal entry:", error);
      setEntries(previous);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">Journal</h2>
      <p className="mt-1 text-sm text-ink-muted">Track how things evolve with this person over time</p>

      <div className="mt-5 grid gap-3">
        <Textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What happened today?"
        />
        {draft.trim() && (
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="datetime-local"
              value={draftTime}
              onChange={(event) => setDraftTime(event.target.value)}
              className="w-auto text-sm"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              Add entry
            </button>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">No entries yet.</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {entries.map((entry) => (
            <JournalEntryRow
              key={entry.id}
              entry={entry}
              onSave={(content, createdAt) => handleSave(entry.id, content, createdAt)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface JournalEntryRowProps {
  entry: CustomerJournalEntry;
  onSave: (content: string, createdAt: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

function JournalEntryRow({ entry, onSave, onDelete }: JournalEntryRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.content);
  const [timeValue, setTimeValue] = useState(() => toDatetimeLocalValue(entry.created_at));
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleSubmitEdit() {
    const content = value.trim();
    if (!content) return;
    setSaving(true);
    try {
      await onSave(content, new Date(timeValue).toISOString());
      setEditing(false);
    } catch (error) {
      console.error("Failed to save journal entry:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-ink-muted">{formatDateTime(entry.created_at)}</span>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Entry options"
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-black/5"
          >
            <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 w-28 overflow-hidden rounded-xl border border-black/10 bg-card shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium transition hover:bg-background"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium text-danger transition hover:bg-background"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Delete
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-2 grid gap-2">
          <Textarea
            autoFocus
            rows={3}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={saving}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="datetime-local"
              value={timeValue}
              onChange={(event) => setTimeValue(event.target.value)}
              disabled={saving}
              className="w-auto text-sm"
            />
            <button
              type="button"
              onClick={handleSubmitEdit}
              disabled={saving}
              className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2 text-sm")}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{entry.content}</p>
      )}
    </div>
  );
}
