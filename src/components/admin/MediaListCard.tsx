"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Check, Loader2, MoreVertical, Plus } from "lucide-react";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mediaItemFormSchema, type MediaItemFormValues } from "@/lib/media-item-schema";
import type { MediaItem } from "@/lib/media-item";

interface MediaListCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  categoryLabel: string;
  doneLabel: string;
  notDoneLabel: string;
  items: MediaItem[];
  onAdd: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleDone: (id: string, done: boolean) => Promise<void>;
  onUpdateNote: (id: string, note: string) => Promise<void>;
}

// Deliberately not an Accordion, and not a bordered-box-per-item list like
// the daily trackers (Mental health/Calorie/Workout) — this is a running
// list you add to occasionally, not something you fill in every day, so it
// reads as a plain numbered list instead.
export function MediaListCard({
  icon,
  title,
  subtitle,
  categoryLabel,
  doneLabel,
  notDoneLabel,
  items: initialItems,
  onAdd,
  onDelete,
  onToggleDone,
  onUpdateNote,
}: MediaListCardProps) {
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MediaItemFormValues>({
    resolver: zodResolver(mediaItemFormSchema),
    defaultValues: { title: "", category: "", url: "" },
  });

  async function onSubmit(values: MediaItemFormValues) {
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("category", values.category ?? "");
    formData.set("url", values.url ?? "");
    await onAdd(formData);

    setItems((current) => [
      {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        title: values.title,
        category: values.category || null,
        url: values.url || null,
        done: false,
        note: null,
      },
      ...current,
    ]);
    reset();
    setAddOpen(false);
  }

  async function handleDelete(id: string) {
    const previous = items;
    setDeletingId(id);
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      await onDelete(id);
    } catch (error) {
      console.error(`Failed to delete ${title.toLowerCase()} item:`, error);
      setItems(previous);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleDone(id: string, done: boolean) {
    const previous = items;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, done } : item)));
    try {
      await onToggleDone(id, done);
    } catch (error) {
      console.error(`Failed to update ${title.toLowerCase()} item:`, error);
      setItems(previous);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent" aria-hidden="true">
            {icon}
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="text-sm text-ink-muted">{subtitle}</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`Add to ${title.toLowerCase()}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 text-foreground transition hover:bg-foreground/5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </DialogTrigger>
          <DialogContent open={addOpen}>
            <DialogTitle className="text-lg font-semibold tracking-tight">Add {title.toLowerCase()}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-muted">
              A quick note for later — you can fill in the rest anytime.
            </DialogDescription>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
              <FormField id={`${title}-title`} label="Title" required error={errors.title?.message}>
                <Input id={`${title}-title`} {...register("title")} />
              </FormField>
              <FormField id={`${title}-category`} label={categoryLabel} error={errors.category?.message}>
                <Input id={`${title}-category`} {...register("category")} />
              </FormField>
              <FormField id={`${title}-url`} label="URL" error={errors.url?.message}>
                <Input id={`${title}-url`} placeholder="https://..." {...register("url")} />
              </FormField>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(buttonVariants({ variant: "primary" }), "mt-1 w-full")}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Add"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">Nothing here yet.</p>
      ) : (
        <ol className="mt-5 grid gap-0.5">
          {items.map((item, index) => (
            <MediaItemRow
              key={item.id}
              number={index + 1}
              item={item}
              doneLabel={doneLabel}
              notDoneLabel={notDoneLabel}
              deleting={deletingId === item.id}
              onDelete={() => handleDelete(item.id)}
              onToggleDone={(done) => handleToggleDone(item.id, done)}
              onUpdateNote={(note) => onUpdateNote(item.id, note)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

interface MediaItemRowProps {
  number: number;
  item: MediaItem;
  doneLabel: string;
  notDoneLabel: string;
  deleting: boolean;
  onDelete: () => void;
  onToggleDone: (done: boolean) => void;
  onUpdateNote: (note: string) => Promise<void>;
}

function MediaItemRow({
  number,
  item,
  doneLabel,
  notDoneLabel,
  deleting,
  onDelete,
  onToggleDone,
  onUpdateNote,
}: MediaItemRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(item.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
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

  async function handleSaveNote() {
    setSavingNote(true);
    try {
      await onUpdateNote(note);
      setEditingNote(false);
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <li className="border-b border-black/5 py-2 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-right text-xs text-ink-muted">{number}.</span>

        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1 text-sm font-medium"
              >
                <span className={cn("transition group-hover:text-accent", item.done && "text-ink-muted line-through")}>
                  {item.title}
                </span>
                <ArrowUpRight
                  className="h-3 w-3 shrink-0 text-ink-muted transition group-hover:text-accent"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <span className={cn("text-sm font-medium", item.done && "text-ink-muted line-through")}>
                {item.title}
              </span>
            )}
            {item.category && <span className="text-xs text-ink-muted">{item.category}</span>}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleDone(!item.done)}
          aria-pressed={item.done}
          title={item.done ? doneLabel : notDoneLabel}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
            item.done ? "border-accent bg-accent/10 text-accent" : "border-black/15 text-ink-muted hover:border-black/25"
          )}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Options"
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-black/5"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 w-32 overflow-hidden rounded-xl border border-black/10 bg-card shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setEditingNote(true);
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium transition hover:bg-background"
              >
                {item.note ? "Edit note" : "Add note"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium text-danger transition hover:bg-background"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {item.note && !editingNote && (
        <p className="mt-1 pl-8 text-xs text-ink-muted">{item.note}</p>
      )}

      {editingNote && (
        <div className="mt-1 flex items-center gap-2 pl-8">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note..."
            autoFocus
            className="text-sm"
          />
          <button
            type="button"
            onClick={handleSaveNote}
            disabled={savingNote}
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0 px-4 py-2 text-sm")}
          >
            {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Save"}
          </button>
        </div>
      )}
    </li>
  );
}
