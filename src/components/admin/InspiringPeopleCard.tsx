"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Loader2, MoreVertical, Plus, Sparkles } from "lucide-react";
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
import { inspiringPersonFormSchema, type InspiringPersonFormValues } from "@/lib/inspiring-person-schema";
import type { InspiringPerson } from "@/lib/inspiring-person";

interface InspiringPeopleCardProps {
  people: InspiringPerson[];
  onAdd: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateReason: (id: string, reason: string) => Promise<void>;
}

// Deliberately not an Accordion, and not a bordered-box-per-item list like
// the daily trackers — this is a running list you add to occasionally, not
// something you fill in every day, so it reads as a plain numbered list.
export function InspiringPeopleCard({
  people: initialPeople,
  onAdd,
  onDelete,
  onUpdateReason,
}: InspiringPeopleCardProps) {
  const [people, setPeople] = useState(initialPeople);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InspiringPersonFormValues>({
    resolver: zodResolver(inspiringPersonFormSchema),
    defaultValues: { name: "", reason: "", url: "" },
  });

  async function onSubmit(values: InspiringPersonFormValues) {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("reason", values.reason ?? "");
    formData.set("url", values.url ?? "");
    await onAdd(formData);

    setPeople((current) => [
      {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        name: values.name,
        reason: values.reason || null,
        url: values.url || null,
      },
      ...current,
    ]);
    reset();
    setAddOpen(false);
  }

  async function handleDelete(id: string) {
    const previous = people;
    setDeletingId(id);
    setPeople((current) => current.filter((person) => person.id !== id));
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete person:", error);
      setPeople(previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent" aria-hidden="true">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">People who inspire me</h2>
            <p className="text-sm text-ink-muted">A running list to come back to</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Add someone"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 text-foreground transition hover:bg-foreground/5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </DialogTrigger>
          <DialogContent open={addOpen}>
            <DialogTitle className="text-lg font-semibold tracking-tight">Add someone</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-muted">
              Who&apos;s on your mind lately?
            </DialogDescription>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4">
              <FormField id="person-name" label="Name" required error={errors.name?.message}>
                <Input id="person-name" {...register("name")} />
              </FormField>
              <FormField id="person-reason" label="Why they inspire you" error={errors.reason?.message}>
                <Input id="person-reason" {...register("reason")} />
              </FormField>
              <FormField id="person-url" label="URL" error={errors.url?.message}>
                <Input id="person-url" placeholder="https://..." {...register("url")} />
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

      {people.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">Nobody added yet.</p>
      ) : (
        <ol className="mt-5 grid gap-0.5">
          {people.map((person, index) => (
            <PersonRow
              key={person.id}
              number={index + 1}
              person={person}
              deleting={deletingId === person.id}
              onDelete={() => handleDelete(person.id)}
              onUpdateReason={(reason) => onUpdateReason(person.id, reason)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

interface PersonRowProps {
  number: number;
  person: InspiringPerson;
  deleting: boolean;
  onDelete: () => void;
  onUpdateReason: (reason: string) => Promise<void>;
}

function PersonRow({ number, person, deleting, onDelete, onUpdateReason }: PersonRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingReason, setEditingReason] = useState(false);
  const [reason, setReason] = useState(person.reason ?? "");
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

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdateReason(reason);
      setEditingReason(false);
    } catch (error) {
      console.error("Failed to save reason:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="border-b border-black/5 py-2 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-right text-xs text-ink-muted">{number}.</span>

        <div className="min-w-0 flex-1">
          {person.url ? (
            <a href={person.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1">
              <span className="text-sm font-medium transition group-hover:text-accent">{person.name}</span>
              <ArrowUpRight
                className="h-3 w-3 shrink-0 text-ink-muted transition group-hover:text-accent"
                aria-hidden="true"
              />
            </a>
          ) : (
            <span className="text-sm font-medium">{person.name}</span>
          )}
        </div>

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
                  setEditingReason(true);
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium transition hover:bg-background"
              >
                {person.reason ? "Edit reason" : "Add reason"}
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

      {person.reason && !editingReason && (
        <p className="mt-1 pl-8 text-xs text-ink-muted">{person.reason}</p>
      )}

      {editingReason && (
        <div className="mt-1 flex items-center gap-2 pl-8">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why they inspire you..."
            autoFocus
            className="text-sm"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0 px-4 py-2 text-sm")}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Save"}
          </button>
        </div>
      )}
    </li>
  );
}
