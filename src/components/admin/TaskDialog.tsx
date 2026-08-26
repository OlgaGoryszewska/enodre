"use client";

import { useState } from "react";
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
import { taskFormSchema, type TaskFormValues } from "@/lib/task-schema";
import { createTask, updateTask, deleteTask } from "@/app/admin/dashboard/actions";
import type { Task, TaskStatus } from "@/lib/task";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  createStatus: TaskStatus | null;
}

export function TaskDialog({ open, onOpenChange, task, createStatus }: TaskDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    values: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      startDate: task?.start_date ?? "",
      endDate: task?.end_date ?? "",
      repeatDaily: task?.repeat_daily ?? false,
    },
  });

  const [startDateValue, endDateValue] = watch(["startDate", "endDate"]);
  const hasDateRange = Boolean(startDateValue && endDateValue);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setError(null);
  }

  async function onSubmit(values: TaskFormValues) {
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("description", values.description ?? "");
    formData.set("startDate", values.startDate ?? "");
    formData.set("endDate", values.endDate ?? "");
    if (values.repeatDaily && values.startDate && values.endDate) {
      formData.set("repeatDaily", "on");
    }

    try {
      if (task) {
        await updateTask(task.id, formData);
      } else if (createStatus) {
        await createTask(createStatus, formData);
      }
      onOpenChange(false);
      reset({ title: "", description: "", startDate: "", endDate: "", repeatDaily: false });
    } catch {
      setError("Something went wrong saving this task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete() {
    if (!task) return;
    setIsDeleting(true);
    setError(null);

    try {
      await deleteTask(task.id);
      onOpenChange(false);
    } catch {
      setError("Something went wrong deleting this task.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open}>
        <DialogTitle className="text-xl font-semibold tracking-tight">
          {task ? "Edit task" : "New task"}
        </DialogTitle>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-5">
          <FormField id="title" label="Title" required error={errors.title?.message}>
            <Input id="title" placeholder="Follow up with FuelFlo" {...register("title")} />
          </FormField>

          <FormField id="description" label="Description" error={errors.description?.message}>
            <Textarea id="description" rows={3} {...register("description")} />
          </FormField>

          <div className="grid gap-5">
            <FormField id="startDate" label="Start date" error={errors.startDate?.message}>
              <Input id="startDate" type="date" {...register("startDate")} />
            </FormField>
            <FormField id="endDate" label="Finish date" error={errors.endDate?.message}>
              <Input id="endDate" type="date" {...register("endDate")} />
            </FormField>
          </div>
          <p className="-mt-3 text-xs text-ink-muted">
            Set both dates to show this task on the calendar.
          </p>

          {hasDateRange && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-accent" {...register("repeatDaily")} />
              Repeat daily on the calendar until the finish date
            </label>
          )}

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
            {task ? (
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
                <span>{task ? "Save changes" : "Add task"}</span>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
