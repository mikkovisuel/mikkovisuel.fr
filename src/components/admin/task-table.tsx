import Link from "next/link";
import { CaretUp, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { TaskStatusSelect } from "@/components/admin/task-status-select";
import { TaskPinButton } from "@/components/admin/task-pin-button";
import { TaskTimeGauge } from "@/components/admin/task-time-gauge";
import { StatusBadge } from "@/components/status-badge";
import { AttachmentBadge } from "@/components/attachment-badge";
import { sendTaskReminder } from "@/lib/actions/tasks";
import {
  isTaskOverdue,
  isTaskDueToday,
  taskDateFormatterShort,
  type TaskSortField,
  type TaskSortDir,
} from "@/lib/tasks";
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

const COLUMNS: { label: string; field?: TaskSortField }[] = [
  { label: "Évènement", field: "evenement" },
  { label: "Échéance", field: "echeance" },
  { label: "Client", field: "client" },
  { label: "Tâche", field: "tache" },
  { label: "Type" },
  { label: "Formats" },
  { label: "Temps" },
  { label: "Statut", field: "statut" },
  { label: "" },
];

function sortHref(
  field: TaskSortField,
  activeField: TaskSortField,
  activeDir: TaskSortDir,
  clientId?: string,
  status?: string,
) {
  const nextDir: TaskSortDir = field === activeField && activeDir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  if (clientId) params.set("clientId", clientId);
  if (status) params.set("status", status);
  params.set("tri", field);
  params.set("dir", nextDir);
  return `/admin/taches?${params.toString()}`;
}

// Vue tableau, plus compacte que les cartes empilées de `TaskRow` : une
// colonne par information, pour scanner beaucoup de tâches d'un coup d'œil.
export function TaskTable({
  tasks,
  statusOptions,
  sortField,
  sortDir,
  clientId,
  status,
  emptyMessage = "Aucune tâche pour le moment.",
}: {
  tasks: TaskTableTask[];
  statusOptions: { slug: string; label: string }[];
  sortField: TaskSortField;
  sortDir: TaskSortDir;
  clientId?: string;
  status?: string;
  emptyMessage?: string;
}) {
  if (tasks.length === 0) {
    return <p className="mt-8 text-sm text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
            {COLUMNS.map((column) => (
              <th key={column.label || "actions"} className="px-4 py-3 font-medium first:pl-6 last:pr-6">
                {!column.label ? (
                  <span className="sr-only">Actions</span>
                ) : column.field ? (
                  <Link
                    href={sortHref(column.field, sortField, sortDir, clientId, status)}
                    className="inline-flex items-center gap-1 transition-colors hover:text-ink"
                  >
                    {column.label}
                    {sortField === column.field &&
                      (sortDir === "asc" ? (
                        <CaretUp size={11} weight="bold" />
                      ) : (
                        <CaretDown size={11} weight="bold" />
                      ))}
                  </Link>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tasks.map((task) => {
            const overdue = isTaskOverdue(task);
            const dueToday = isTaskDueToday(task);
            return (
              <tr key={task.id}>
                <td className="whitespace-nowrap px-4 py-3 pl-6 align-top text-ink-muted">
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
                            <button
                              type="submit"
                              className="underline decoration-dotted underline-offset-2 hover:text-ink"
                            >
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
                  <Link
                    href={`/admin/clients/${task.clientId}`}
                    className="text-ink-muted transition-colors hover:text-ink"
                  >
                    {task.client.name}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <TaskPinButton taskId={task.id} pinned={task.pinnedAt !== null} />
                    <Link
                      href={`/admin/taches/${task.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {task.title}
                    </Link>
                    <AttachmentBadge
                      attachmentCount={task._count?.attachments}
                      deliverableCount={task._count?.deliverables}
                    />
                  </div>
                  {task.refusalReason && (
                    <p
                      className="mt-1 max-w-xs truncate text-xs text-danger"
                      title={task.refusalReason}
                    >
                      Motif de refus : {task.refusalReason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {task.types.length > 0 && (
                    <div className="flex max-w-[12rem] flex-wrap gap-1.5">
                      {task.types.map((type) => (
                        <StatusBadge key={type.id} label={type.label} color={type.color} />
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {task.formats.length > 0 && (
                    <div className="flex max-w-[12rem] flex-wrap gap-1.5">
                      {task.formats.map((format) => (
                        <StatusBadge key={format.id} label={format.label} color={format.color} />
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <TaskTimeGauge
                    spentMs={sumTaskTimeMs(task.timeEntries)}
                    estimatedMinutes={task.estimatedMinutes}
                    compact
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <TaskStatusSelect
                    taskId={task.id}
                    currentSlug={task.status.slug}
                    currentColor={task.status.color}
                    statuses={statusOptions}
                  />
                </td>
                <td className="px-4 py-3 pr-6 align-top text-right">
                  <Link
                    href={`/admin/taches/${task.id}`}
                    className="text-xs text-ink-muted transition-colors hover:text-ink"
                  >
                    Modifier
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
