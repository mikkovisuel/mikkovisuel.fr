import Link from "next/link";
import { CaretUp, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { TaskTableRow } from "@/components/admin/task-table-row";
import type { TaskSortField, TaskSortDir } from "@/lib/tasks";

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

// Colonne de gauche vide (triangle de dépli, voir TaskTableRow) : ni
// libellé, ni tri, juste l'alignement avec le bouton de chaque ligne.
const COLUMNS: { label: string; field?: TaskSortField }[] = [
  { label: "" },
  { label: "Évènement", field: "evenement" },
  { label: "Échéance", field: "echeance" },
  { label: "Client", field: "client" },
  { label: "Tâche", field: "tache" },
  { label: "Statut", field: "statut" },
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
// Type/Formats/Temps sont repliés par ligne (voir TaskTableRow) plutôt que
// des colonnes toujours visibles — moins consultés au premier coup d'œil.
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
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
            {COLUMNS.map((column) => (
              <th key={column.label || "toggle"} className="px-4 py-3 font-medium first:pl-6 last:pr-6">
                {!column.label ? (
                  <span className="sr-only">Détails</span>
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
          {tasks.map((task) => (
            <TaskTableRow key={task.id} task={task} statusOptions={statusOptions} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
