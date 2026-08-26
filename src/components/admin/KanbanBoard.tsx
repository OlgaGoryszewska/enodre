"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, Plus } from "lucide-react";
import { TaskDialog } from "@/components/admin/TaskDialog";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUS_VALUES, taskStatusLabels, type Task, type TaskStatus } from "@/lib/task";

interface KanbanBoardProps {
  initialTasks: Task[];
}

function groupTasks(tasks: Task[]): Record<TaskStatus, Task[]> {
  const grouped: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const task of [...tasks].sort((a, b) => a.position - b.position)) {
    grouped[task.status].push(task);
  }
  return grouped;
}

function isStatus(value: string): value is TaskStatus {
  return (TASK_STATUS_VALUES as readonly string[]).includes(value);
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return startDate === endDate ? format(startDate) : `${format(startDate)} – ${format(endDate)}`;
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-xl border border-black/10 bg-background p-3 shadow-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="mt-0.5 touch-none cursor-grab text-ink-muted/50 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onClick} className="flex-1 text-left">
        <p className="text-sm font-medium">{task.title}</p>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{task.description}</p>
        )}
        {formatDateRange(task.start_date, task.end_date) && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            {formatDateRange(task.start_date, task.end_date)}
          </p>
        )}
      </button>
    </div>
  );
}

const columnStyles: Record<TaskStatus, string> = {
  todo: "bg-card",
  in_progress: "bg-[#FFF6C9] border-[#F0E29C]",
  done: "bg-[#EDE7FE] border-[#D6CBFB]",
};

function Column({
  status,
  tasks,
  onAddTask,
  onTaskClick,
}: {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-2xl border border-black/10 p-4 sm:w-80 sm:flex-none ${columnStyles[status]}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
          {taskStatusLabels[status]}
        </h2>
        <span className="text-xs text-ink-muted">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className="flex min-h-[3rem] flex-col gap-2">
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>
      <button
        type="button"
        onClick={onAddTask}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 py-2 text-xs font-semibold text-ink-muted transition hover:border-black/40 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add task
      </button>
    </div>
  );
}

export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);

  // Server Actions (create/edit/delete) revalidate this route, sending fresh
  // initialTasks — resync during render rather than in an effect. Local
  // state otherwise diverges only for the optimistic drag update below.
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const columns = groupTasks(tasks);

  function findColumnOf(id: string): TaskStatus | null {
    if (isStatus(id)) return id;
    for (const status of TASK_STATUS_VALUES) {
      if (columns[status].some((task) => task.id === id)) return status;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((task) => task.id === event.active.id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeColumn = findColumnOf(String(active.id));
    const overColumn = findColumnOf(String(over.id));
    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setTasks((current) =>
      current.map((task) => (task.id === active.id ? { ...task, status: overColumn } : task))
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const grouped = groupTasks(tasks);
    const activeColumn = findColumnOf(String(active.id));
    if (!activeColumn) return;

    const columnTasks = grouped[activeColumn];
    const oldIndex = columnTasks.findIndex((task) => task.id === active.id);
    const overId = String(over.id);
    const newIndex = isStatus(overId)
      ? columnTasks.length - 1
      : columnTasks.findIndex((task) => task.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const previousTasks = tasks;
    const newColumnOrder = arrayMove(columnTasks, oldIndex, newIndex);
    const updatedTasks = tasks.map((task) => {
      if (task.status !== activeColumn) return task;
      const index = newColumnOrder.findIndex((t) => t.id === task.id);
      return index === -1 ? task : { ...task, position: index };
    });

    setTasks(updatedTasks);

    const supabase = createClient();
    const results = await Promise.all(
      newColumnOrder.map((task, index) =>
        supabase
          .from("tasks")
          .update({
            status: activeColumn,
            position: index,
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("Failed to persist task order:", failed.error);
      setTasks(previousTasks);
    }
  }

  function openCreate(status: TaskStatus) {
    setSelectedTask(null);
    setCreateStatus(status);
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setSelectedTask(task);
    setCreateStatus(null);
    setDialogOpen(true);
  }

  return (
    <>
      <h2 className="text-lg font-semibold tracking-tight">Board</h2>
      <DndContext
        id="kanban-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:overflow-x-auto sm:pb-4">
          {TASK_STATUS_VALUES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={columns[status]}
              onAddTask={() => openCreate(status)}
              onTaskClick={openEdit}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="rounded-xl border border-black/10 bg-background p-3 shadow-lg">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        createStatus={createStatus}
      />
    </>
  );
}
