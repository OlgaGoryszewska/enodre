"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Check, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Accordion } from "@/components/admin/Accordion";
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
    <Accordion icon={icon} title={title} subtitle={subtitle}>
      <div className="flex items-center justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <button type="button" className={cn(buttonVariants({ variant: "outline" }))}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
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
        <p className="mt-4 text-sm text-ink-muted">Nothing here yet.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {items.map((item) => (
            <MediaItemRow
              key={item.id}
              item={item}
              doneLabel={doneLabel}
              notDoneLabel={notDoneLabel}
              deleting={deletingId === item.id}
              onDelete={() => handleDelete(item.id)}
              onToggleDone={(done) => handleToggleDone(item.id, done)}
              onUpdateNote={(note) => onUpdateNote(item.id, note)}
            />
          ))}
        </div>
      )}
    </Accordion>
  );
}

interface MediaItemRowProps {
  item: MediaItem;
  doneLabel: string;
  notDoneLabel: string;
  deleting: boolean;
  onDelete: () => void;
  onToggleDone: (done: boolean) => void;
  onUpdateNote: (note: string) => Promise<void>;
}

function MediaItemRow({ item, doneLabel, notDoneLabel, deleting, onDelete, onToggleDone, onUpdateNote }: MediaItemRowProps) {
  const [note, setNote] = useState(item.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const noteDirty = note !== (item.note ?? "");

  async function handleSaveNote() {
    setSavingNote(true);
    try {
      await onUpdateNote(note);
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5"
            >
              <span className="font-medium transition group-hover:text-accent">{item.title}</span>
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-ink-muted transition group-hover:text-accent"
                aria-hidden="true"
              />
            </a>
          ) : (
            <span className="font-medium">{item.title}</span>
          )}
          {item.category && <p className="mt-0.5 text-xs text-ink-muted">{item.category}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleDone(!item.done)}
            aria-pressed={item.done}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition",
              item.done
                ? "border-accent bg-accent/10 text-accent"
                : "border-black/10 text-ink-muted hover:border-black/25"
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {item.done ? doneLabel : notDoneLabel}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Remove ${item.title}`}
            className="text-ink-muted transition hover:text-danger disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note..."
          className="text-sm"
        />
        {noteDirty && (
          <button
            type="button"
            onClick={handleSaveNote}
            disabled={savingNote}
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0 px-4 py-2 text-sm")}
          >
            {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
