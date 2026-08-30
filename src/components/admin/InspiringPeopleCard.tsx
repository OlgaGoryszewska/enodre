"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { inspiringPersonFormSchema, type InspiringPersonFormValues } from "@/lib/inspiring-person-schema";
import type { InspiringPerson } from "@/lib/inspiring-person";

interface InspiringPeopleCardProps {
  people: InspiringPerson[];
  onAdd: (formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateReason: (id: string, reason: string) => Promise<void>;
}

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
    <Accordion
      icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
      title="People who inspire me"
      subtitle="A running list to come back to"
    >
      <div className="flex items-center justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <button type="button" className={cn(buttonVariants({ variant: "outline" }))}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
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
        <p className="mt-4 text-sm text-ink-muted">Nobody added yet.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              deleting={deletingId === person.id}
              onDelete={() => handleDelete(person.id)}
              onUpdateReason={(reason) => onUpdateReason(person.id, reason)}
            />
          ))}
        </div>
      )}
    </Accordion>
  );
}

interface PersonRowProps {
  person: InspiringPerson;
  deleting: boolean;
  onDelete: () => void;
  onUpdateReason: (reason: string) => Promise<void>;
}

function PersonRow({ person, deleting, onDelete, onUpdateReason }: PersonRowProps) {
  const [reason, setReason] = useState(person.reason ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = reason !== (person.reason ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdateReason(reason);
    } catch (error) {
      console.error("Failed to save reason:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        {person.url ? (
          <a href={person.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5">
            <span className="font-medium transition group-hover:text-accent">{person.name}</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 shrink-0 text-ink-muted transition group-hover:text-accent"
              aria-hidden="true"
            />
          </a>
        ) : (
          <span className="font-medium">{person.name}</span>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Remove ${person.name}`}
          className="shrink-0 text-ink-muted transition hover:text-danger disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why they inspire you..."
          className="text-sm"
        />
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0 px-4 py-2 text-sm")}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
