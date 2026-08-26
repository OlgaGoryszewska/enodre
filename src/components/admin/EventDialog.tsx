"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventFormSchema, type EventFormValues } from "@/lib/event-schema";
import { createEvent, updateEvent, deleteEvent } from "@/app/admin/calendar/actions";
import type { CalendarEvent } from "@/lib/calendar";

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  initialDate: Date | null;
}

export function EventDialog({ open, onOpenChange, event, initialDate }: EventDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { title: "", description: "", startTime: "", endTime: "", allDay: false },
  });

  // Clear a stale error from a previous open when the dialog opens again —
  // React's "adjusting state when a prop changes" pattern, during render
  // rather than in an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setError(null);
  }

  useEffect(() => {
    if (!open) return;

    if (event) {
      reset({
        title: event.title,
        description: event.description ?? "",
        startTime: toDatetimeLocal(new Date(event.start_time)),
        endTime: toDatetimeLocal(new Date(event.end_time)),
        allDay: event.all_day,
      });
    } else {
      const start = initialDate ?? new Date();
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      reset({
        title: "",
        description: "",
        startTime: toDatetimeLocal(start),
        endTime: toDatetimeLocal(end),
        allDay: false,
      });
    }
  }, [open, event, initialDate, reset]);

  async function onSubmit(values: EventFormValues) {
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("description", values.description ?? "");
    formData.set("startTime", values.startTime);
    formData.set("endTime", values.endTime);
    if (values.allDay) formData.set("allDay", "on");

    try {
      if (event) {
        await updateEvent(event.id, formData);
      } else {
        await createEvent(formData);
      }
      onOpenChange(false);
    } catch {
      setError("Something went wrong saving this event.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete() {
    if (!event) return;
    setIsDeleting(true);
    setError(null);

    try {
      await deleteEvent(event.id);
      onOpenChange(false);
    } catch {
      setError("Something went wrong deleting this event.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open}>
        <DialogTitle className="text-xl font-semibold tracking-tight">
          {event ? "Edit event" : "New event"}
        </DialogTitle>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-5">
          <FormField id="title" label="Title" required error={errors.title?.message}>
            <Input id="title" placeholder="Discovery call" {...register("title")} />
          </FormField>

          <FormField id="description" label="Description" error={errors.description?.message}>
            <Textarea id="description" rows={3} {...register("description")} />
          </FormField>

          <div className="grid gap-5">
            <FormField id="startTime" label="Starts" required error={errors.startTime?.message}>
              <Input id="startTime" type="datetime-local" {...register("startTime")} />
            </FormField>
            <FormField id="endTime" label="Ends" required error={errors.endTime?.message}>
              <Input id="endTime" type="datetime-local" {...register("endTime")} />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...register("allDay")} />
            All day
          </label>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.2 }}
                role="alert"
                className="flex items-center gap-2 overflow-hidden rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-2 flex items-center justify-between gap-3">
            {event ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger transition hover:opacity-80 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                Delete
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(buttonVariants({ size: "default" }))}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{event ? "Save changes" : "Create event"}</span>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
