"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight, CaretDown } from "@phosphor-icons/react";
import { TaskStatusSelect } from "@/components/admin/task-status-select";
import { TaskPinButton } from "@/components/admin/task-pin-button";
import { TaskTimeGauge } from "@/components/admin/task-time-gauge";
import { StatusBadge } from "@/components/status-badge";
import { AttachmentBadge } from "@/components/attachment-badge";
import { sendTaskReminder } from "@/lib/actions/tasks";
import { isTaskOverdue, isTaskDueToday, taskDateFormatterShort } from "@/lib/tasks";
import { sumTaskTimeMs } from "@/lib/time-tracking";

interface TaskTableTask {
  id: string;
  clientId: string;
  title: string;
  eventDate: Date | null;
  dueDate: Date | null;
  refusalReason: string | null;
  pinnedAt: Date | null;
  estimatedMinutes: number | null;
  timeEntries: { startedAt: Date; endedAt: Date | null }[];
  status: { slug: string; color: string };
  types: { id: string; label: string; color: string }[];
  formats: { id: string; label: string; color: string }[];
  client: { name: string };
  _count?: { deliverables: number; attachments: number };
}

// Colonne "Type / Formats / Temps" repliée par défaut (triangle) — ce sont
// les informations les moins consultées au premier coup d'œil sur la vue
// Liste, comparé à échéance/statut. Le bouton "Modifier" a été retiré : le
// titre de la tâche est déjà un lien vers sa fiche.
export function TaskTableRow({
  task,
  statusOptions,
}: {
  task: TaskTableTask;
  statusOptions: { slug: string; label: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const hasDetails = task.types.length > 0 || task.formats.length > 0 || task.estimatedMinutes !== null;

  return (
    <>
      <tr>
        <td className="w-8 py-3 pl-6 align-top">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? "Masquer type, formats et temps" : "Afficher type, formats et temps"}
            aria-expanded={expanded}
            className="rounded p-0.5 text-ink-muted transition-colors hover:text-ink"
          >
            {expanded ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top text-ink-muted">
          {task.eventDate ? taskDateFormatterShort.format(task.eventDate) : "—"}
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          {task.dueDate ? (
            <span
              className={
                overdue
                  ? "font-medium text-danger"
                  : dueToday
                    ? "font-bold text-blue-600 dark:text-blue-400"
                    : "text-ink-muted"
              }
            >
              {taskDateFormatterShort.format(task.dueDate)}
              {overdue && (
                <>
                  {" · en retard · "}
                  <form action={sendTaskReminder.bind(null, task.id)} className="inline">
                    <button type="submit" className="underline decoration-dotted underline-offset-2 hover:text-ink">
                      Rappel
                    </button>
                  </form>
                </>
              )}
            </span>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <Link href={`/admin/clients/${task.clientId}`} className="text-ink-muted transition-colors hover:text-ink">
            {task.client.name}
          </Link>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex items-center gap-2">
            <TaskPinButton taskId={task.id} pinned={task.pinnedAt !== null} />
            <Link href={`/admin/taches/${task.id}`} className="font-medium text-ink hover:underline">
              {task.title}
            </Link>
            <AttachmentBadge
              attachmentCount={task._count?.attachments}
              deliverableCount={task._count?.deliverables}
            />
          </div>
          {task.refusalReason && (
            <p className="mt-1 max-w-xs truncate text-xs text-danger" title={task.refusalReason}>
              Motif de refus : {task.refusalReason}
            </p>
          )}
        </td>
        <td className="px-4 py-3 pr-6 align-top">
          <TaskStatusSelect
            taskId={task.id}
            currentSlug={task.status.slug}
            currentColor={task.status.color}
            statuses={statusOptions}
          />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface/60">
          <td colSpan={6} className="px-4 py-3 pl-12">
            {hasDetails ? (
              <div className="flex flex-wrap gap-6">
                {task.types.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Type</p>
                    <div className="mt-1.5 flex max-w-xs flex-wrap gap-1.5">
                      {task.types.map((type) => (
                        <StatusBadge key={type.id} label={type.label} color={type.color} />
                      ))}
                    </div>
                  </div>
                )}
                {task.formats.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Formats</p>
                    <div className="mt-1.5 flex max-w-xs flex-wrap gap-1.5">
                      {task.formats.map((format) => (
                        <StatusBadge key={format.id} label={format.label} color={format.color} />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Temps</p>
                  <div className="mt-1.5">
                    <TaskTimeGauge
                      spentMs={sumTaskTimeMs(task.timeEntries)}
                      estimatedMinutes={task.estimatedMinutes}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">Aucun type, format ou temps estimé renseigné.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
