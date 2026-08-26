"use client";

import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { taskStatusLabels, type Task } from "@/lib/task";
import type { CalendarEvent } from "@/lib/calendar";

interface DayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: CalendarEvent[];
  tasks: Task[];
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onEditTask: (task: Task) => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function DayDialog({
  open,
  onOpenChange,
  date,
  events,
  tasks,
  onAddEvent,
  onEditEvent,
  onEditTask,
}: DayDialogProps) {
  const title = date
    ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open}>
        <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>

        <div className="mt-6 grid gap-6">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Events</h3>
              <button
                type="button"
                onClick={onAddEvent}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition hover:opacity-80"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add event
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {events.length === 0 && <p className="text-sm text-ink-muted">No events.</p>}
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEditEvent(event)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-background p-3 text-left text-sm transition hover:border-black/25"
                >
                  <span className="font-medium">{event.title}</span>
                  {!event.all_day && (
                    <span className="flex-none text-xs text-ink-muted">{formatTime(event.start_time)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Tasks</h3>
            <div className="mt-3 grid gap-2">
              {tasks.length === 0 && <p className="text-sm text-ink-muted">No tasks.</p>}
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-background p-3 text-left text-sm transition hover:border-black/25"
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="flex-none text-xs text-ink-muted">{taskStatusLabels[task.status]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
