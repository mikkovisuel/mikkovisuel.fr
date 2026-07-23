"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CaretUp, CaretDown } from "@phosphor-icons/react";
import { TaskTableRow } from "@/components/admin/task-table-row";
import { bulkSetTaskStatus, bulkArchiveTasks } from "@/lib/actions/tasks";
import type { TaskStatusSlug } from "@/lib/dropdown-lists";
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
// Sélection multi-lignes (case à cocher) pour changer le statut ou archiver
// plusieurs tâches en une fois, plutôt que ligne par ligne.
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusKey, setBulkStatusKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  if (tasks.length === 0) {
    return <p className="mt-8 text-sm text-ink-muted">{emptyMessage}</p>;
  }

  const allSelected = selectedIds.size > 0 && selectedIds.size === tasks.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(tasks.map((task) => task.id)));
  }

  function handleBulkStatus(slug: string) {
    if (!slug) return;
    const ids = [...selectedIds];
    startTransition(async () => {
      await bulkSetTaskStatus(ids, slug as TaskStatusSlug);
      setSelectedIds(new Set());
      setBulkStatusKey((key) => key + 1);
    });
  }

  function handleBulkArchive() {
    const ids = [...selectedIds];
    startTransition(async () => {
      await bulkArchiveTasks(ids);
      setSelectedIds(new Set());
    });
  }

  return (
    <div className="mt-8">
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <span className="font-medium text-ink">
            {selectedIds.size} tâche{selectedIds.size > 1 ? "s" : ""} sélectionnée
            {selectedIds.size > 1 ? "s" : ""}
          </span>
          <select
            key={bulkStatusKey}
            defaultValue=""
            disabled={isPending}
            onChange={(event) => handleBulkStatus(event.target.value)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          >
            <option value="">Changer le statut…</option>
            {statusOptions.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={handleBulkArchive}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
          >
            Archiver
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Annuler la sélection
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="w-8 py-3 pl-6 font-medium">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-accent"
                />
              </th>
              {COLUMNS.map((column) => (
                <th key={column.label || "toggle"} className="px-4 py-3 font-medium last:pr-6">
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
              <TaskTableRow
                key={task.id}
                task={task}
                statusOptions={statusOptions}
                selected={selectedIds.has(task.id)}
                onToggleSelect={() => toggleSelect(task.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
