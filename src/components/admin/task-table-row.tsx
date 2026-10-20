"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight, CaretDown } from "@phosphor-icons/react";
import { TaskStatusSelect } from "@/components/admin/task-status-select";
import { TaskPinButton } from "@/components/admin/task-pin-button";
import { TaskTimerIconButton } from "@/components/admin/task-timer-icon-button";
import { TaskTimeGauge } from "@/components/admin/task-time-gauge";
import { StatusBadge } from "@/components/status-badge";
import { AttachmentBadge } from "@/components/attachment-badge";
import { sendTaskReminder } from "@/lib/actions/tasks";
import { isTaskOverdue, isTaskDueToday, taskDateFormatterShort } from "@/lib/tasks";
import { sumTaskTimeMs, formatDurationShort } from "@/lib/time-tracking";

interface TaskTableTask {
  /** Tâche interne (demandée depuis une publication réseaux). */
  internal?: boolean;
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
  selected = false,
  onToggleSelect,
  columns = ["client", "echeance", "evenement", "statut", "temps"],
}: {
  task: TaskTableTask;
  statusOptions: { slug: string; label: string }[];
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Colonnes facultatives visibles, dans l'ordre (voir TASK_COLUMN_DEFS). */
  columns?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const hasDetails = task.types.length > 0 || task.formats.length > 0 || task.estimatedMinutes !== null;
  const isTimerRunning = task.timeEntries.some((entry) => entry.endedAt === null);
  const spentMs = sumTaskTimeMs(task.timeEntries);

  return (
    <>
      <tr className={`group ${selected ? "bg-select" : ""}`}>
        <td className="w-8 py-2.5 pl-4 align-middle sm:pl-6 lg:pl-8 2xl:pl-12">
          <input
            type="checkbox"
            aria-label={`Sélectionner ${task.title}`}
            checked={selected}
            onChange={() => onToggleSelect?.()}
            className="h-4 w-4 accent-accent"
          />
        </td>
        <td className="w-8 py-2.5 align-middle">
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
        <td className="min-w-[18rem] px-4 py-2.5 align-middle">
          <div className="flex items-center gap-2">
            <Link href={`/admin/taches/${task.id}`} className="font-medium text-ink hover:underline">
              {task.title}
            </Link>
            {task.internal && (
              <span
                title="Tâche interne demandée depuis une publication réseaux — invisible du client"
                className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-muted"
              >
                Interne
              </span>
            )}
            <AttachmentBadge
              attachmentCount={task._count?.attachments}
              deliverableCount={task._count?.deliverables}
            />
            {/* Épingle et chrono, comme les drapeaux de Mail : toujours
                visibles quand ils sont actifs, sinon au survol de la ligne
                ou au clavier — aucune commande ne disparaît. */}
            <span
              className={`ml-auto flex shrink-0 items-center gap-0.5 transition-opacity ${
                task.pinnedAt !== null || isTimerRunning
                  ? ""
                  : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
              }`}
            >
              <TaskPinButton taskId={task.id} pinned={task.pinnedAt !== null} />
              <TaskTimerIconButton taskId={task.id} isRunning={isTimerRunning} />
            </span>
          </div>
          {task.refusalReason && (
            <p className="max-w-xs truncate pb-1 text-xs text-danger" title={task.refusalReason}>
              Motif de refus : {task.refusalReason}
            </p>
          )}
        </td>
        {/* Colonnes facultatives, dans l'ordre du profil (2026-10-20). */}
        {columns.map((column) => {
          switch (column) {
            case "client":
              return (
                <td key="client" className="whitespace-nowrap px-4 py-2.5 align-middle">
                  <Link href={`/admin/clients/${task.clientId}`} className="text-ink-muted transition-colors hover:text-ink">
                    {task.client.name}
                  </Link>
                </td>
              );
            case "echeance":
              return (
                <td key="echeance" className="whitespace-nowrap px-4 py-2.5 align-middle">
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
              );
            case "evenement":
              return (
                <td key="evenement" className="whitespace-nowrap px-4 py-2.5 align-middle text-ink-muted">
                  {task.eventDate ? taskDateFormatterShort.format(task.eventDate) : "—"}
                </td>
              );
            case "statut":
              return (
                <td key="statut" className="px-4 py-2.5 align-middle">
                  <TaskStatusSelect
                    taskId={task.id}
                    currentSlug={task.status.slug}
                    currentColor={task.status.color}
                    statuses={statusOptions}
                  />
                </td>
              );
            case "temps":
              return (
                <td key="temps" className="whitespace-nowrap px-4 py-2.5 text-right align-middle tabular-nums text-ink-muted">
                  {spentMs > 0 ? formatDurationShort(spentMs) : "—"}
                </td>
              );
            case "type":
            case "formats": {
              const items = column === "type" ? task.types : task.formats;
              return (
                <td key={column} className="px-4 py-2.5 align-middle">
                  {items.length > 0 ? (
                    <div className="flex max-w-[14rem] flex-nowrap items-center gap-1 overflow-hidden">
                      {items.slice(0, 2).map((item) => (
                        <StatusBadge key={item.id} label={item.label} color={item.color} />
                      ))}
                      {items.length > 2 && <span className="text-xs text-ink-muted">+{items.length - 2}</span>}
                    </div>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
              );
            }
            default:
              return null;
          }
        })}
        <td aria-hidden className="w-0 pr-0 sm:pr-2 lg:pr-4 2xl:pr-8" />
      </tr>
      {expanded && (
        <tr className="bg-surface/60">
          <td colSpan={columns.length + 4} className="px-4 py-3 pl-12 lg:pl-16">
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

// Version carte, pour le téléphone (2026-10-14) : le tableau à six colonnes
// y devenait illisible — colonnes coupées, et chaque ligne haute de 250 px
// parce que le titre s'enroulait dans une colonne étroite. Mêmes
// informations et mêmes commandes, empilées dans l'ordre de lecture : titre,
// client, dates, statut.
export function TaskCard({
  task,
  statusOptions,
  selected = false,
  onToggleSelect,
}: {
  task: TaskTableTask;
  statusOptions: { slug: string; label: string }[];
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const isTimerRunning = task.timeEntries.some((entry) => entry.endedAt === null);

  return (
    <li className={`px-4 py-3 ${selected ? "bg-select" : ""}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label={`Sélectionner ${task.title}`}
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 shrink-0 accent-accent"
        />
        <div className="min-w-0 flex-1">
          <Link href={`/admin/taches/${task.id}`} className="font-medium text-ink hover:underline">
            {task.title}
          </Link>
          <p className="mt-1 text-sm text-ink-muted">
            <Link href={`/admin/clients/${task.clientId}`} className="transition-colors hover:text-ink">
              {task.client.name}
            </Link>
            {task.internal && " · interne"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {task.dueDate ? (
              <span
                className={
                  overdue
                    ? "font-medium text-danger"
                    : dueToday
                      ? "font-bold text-blue-600 dark:text-blue-400"
                      : undefined
                }
              >
                Échéance {taskDateFormatterShort.format(task.dueDate)}
                {overdue && " · en retard"}
              </span>
            ) : (
              "Sans échéance"
            )}
            {task.eventDate && ` · évènement ${taskDateFormatterShort.format(task.eventDate)}`}
          </p>
          {task.refusalReason && (
            <p className="mt-1 text-xs text-danger">Motif de refus : {task.refusalReason}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
        <TaskStatusSelect
          taskId={task.id}
          currentSlug={task.status.slug}
          currentColor={task.status.color}
          statuses={statusOptions}
        />
        <TaskPinButton taskId={task.id} pinned={task.pinnedAt !== null} />
        <TaskTimerIconButton taskId={task.id} isRunning={isTimerRunning} />
        <AttachmentBadge attachmentCount={task._count?.attachments} deliverableCount={task._count?.deliverables} />
        {overdue && (
          <form action={sendTaskReminder.bind(null, task.id)}>
            <button type="submit" className="text-xs text-ink-muted underline decoration-dotted underline-offset-2 hover:text-ink">
              Rappel
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
