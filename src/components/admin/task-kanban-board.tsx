"use client";

import { useTransition } from "react";
import Link from "next/link";
import { setTaskStatus } from "@/lib/actions/tasks";
import { StatusBadge } from "@/components/status-badge";
import { AttachmentBadge } from "@/components/attachment-badge";
import { TaskStatusSelect } from "@/components/admin/task-status-select";
import { isTaskOverdue, taskDateFormatter } from "@/lib/tasks";
import { PALETTE_BADGE_CLASSES, type PaletteColor, type TaskStatusSlug } from "@/lib/dropdown-lists";

interface KanbanTask {
  id: string;
  clientId: string;
  title: string;
  dueDate: Date | null;
  status: { slug: string; color: string };
  client: { name: string };
  types: { id: string; label: string; color: string }[];
  formats: { id: string; label: string; color: string }[];
  _count?: { deliverables: number; attachments: number };
}

interface StatusColumn {
  slug: string;
  label: string;
  color: string;
}

// Drag-and-drop natif (pas de lib dnd dans le projet) + `TaskStatusSelect`
// en repli sur chaque carte pour le clavier/tactile — les deux chemins
// appellent le même `setTaskStatus`.
export function TaskKanbanBoard({
  tasks,
  statuses,
}: {
  tasks: KanbanTask[];
  statuses: StatusColumn[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDrop(event: React.DragEvent<HTMLDivElement>, slug: string) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    if (!taskId) return;
    startTransition(() => {
      setTaskStatus(taskId, slug as TaskStatusSlug);
    });
  }

  return (
    <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status.slug === status.slug);
        const classes =
          PALETTE_BADGE_CLASSES[status.color as PaletteColor] ?? PALETTE_BADGE_CLASSES.slate;

        return (
          <div
            key={status.slug}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, status.slug)}
            className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-line bg-surface-elevated/50 p-3"
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
              >
                {status.label}
              </span>
              <span className="text-xs text-ink-muted">{columnTasks.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {columnTasks.length === 0 && (
                <p className="px-1 py-2 text-xs text-ink-muted">Aucune tâche.</p>
              )}
              {columnTasks.map((task) => {
                const overdue = isTaskOverdue(task);
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", task.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className={`flex cursor-grab flex-col gap-2 rounded-xl border border-line bg-surface-elevated p-3 shadow-sm transition-opacity active:cursor-grabbing ${
                      isPending ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/taches/${task.id}`}
                        className="text-sm font-medium text-ink hover:underline"
                      >
                        {task.title}
                      </Link>
                      <AttachmentBadge
                        attachmentCount={task._count?.attachments}
                        deliverableCount={task._count?.deliverables}
                      />
                    </div>
                    <Link
                      href={`/admin/clients/${task.clientId}`}
                      className="text-xs text-ink-muted transition-colors hover:text-ink"
                    >
                      {task.client.name}
                    </Link>
                    {(task.types.length > 0 || task.formats.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {task.types.map((type) => (
                          <StatusBadge key={type.id} label={type.label} color={type.color} />
                        ))}
                        {task.formats.map((format) => (
                          <StatusBadge key={format.id} label={format.label} color={format.color} />
                        ))}
                      </div>
                    )}
                    {task.dueDate && (
                      <p
                        className={`text-xs ${overdue ? "font-medium text-danger" : "text-ink-muted"}`}
                      >
                        Échéance le {taskDateFormatter.format(task.dueDate)}
                        {overdue ? " — en retard" : ""}
                      </p>
                    )}
                    <TaskStatusSelect
                      taskId={task.id}
                      currentSlug={task.status.slug}
                      currentColor={task.status.color}
                      statuses={statuses}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
