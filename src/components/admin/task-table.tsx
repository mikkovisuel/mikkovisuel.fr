"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CaretUp, CaretDown } from "@phosphor-icons/react";
import { TaskTableRow, TaskCard } from "@/components/admin/task-table-row";
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

// Colonnes facultatives, dans l'ordre et la visibilité choisis par l'admin
// (« Mon affichage », 2026-10-20). « Tâche » est toujours affichée, précédée
// de la case de sélection et du triangle de dépli. Ordre d'origine (refonte
// macOS, 2026-10-14) : à qui, pour quand, où elle en est et le temps passé.
export const TASK_COLUMN_DEFS: Record<string, { label: string; field?: TaskSortField; align?: "right" }> = {
  client: { label: "Client", field: "client" },
  echeance: { label: "Échéance", field: "echeance" },
  evenement: { label: "Évènement", field: "evenement" },
  statut: { label: "Statut", field: "statut" },
  temps: { label: "Temps", align: "right" },
  type: { label: "Type" },
  formats: { label: "Formats" },
};
export const DEFAULT_TASK_COLUMNS = ["client", "echeance", "evenement", "statut", "temps"];

function sortHref(
  field: TaskSortField,
  activeField: TaskSortField,
  activeDir: TaskSortDir,
  basePath: string,
  clientId?: string,
  status?: string,
) {
  const nextDir: TaskSortDir = field === activeField && activeDir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  // Sur la fiche client, le client est déjà celui de la page : le repasser en
  // paramètre n'aurait aucun effet et alourdirait l'URL.
  if (clientId) params.set("clientId", clientId);
  if (status) params.set("status", status);
  params.set("tri", field);
  params.set("dir", nextDir);
  return `${basePath}?${params.toString()}`;
}

// Liste façon Gmail (refonte « Workspace », livraison 2, 2026-10-20) : hauteur
// de ligne réglée par la densité de l'admin (`ws-list`), survol en relief,
// sélection en jaune clair.
//
// Vue tableau, plus compacte que les cartes empilées d'autrefois : une
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
  basePath = "/admin/taches",
  columns = DEFAULT_TASK_COLUMNS,
  inCard = false,
}: {
  tasks: TaskTableTask[];
  statusOptions: { slug: string; label: string }[];
  sortField: TaskSortField;
  sortDir: TaskSortDir;
  clientId?: string;
  status?: string;
  emptyMessage?: string;
  /** Page cible des liens de tri. La fiche client réutilise ce tableau et
   * doit rester sur elle-même plutôt que renvoyer vers /admin/taches. */
  basePath?: string;
  /** Colonnes facultatives visibles, dans l'ordre (profil de l'admin). */
  columns?: string[];
  /** Dans une carte (fiche client, 2026-10-20) : pas de débord sur les
   * marges de la page, la carte porte déjà le cadre. */
  inCard?: boolean;
}) {
  const shownColumns = columns.filter((key) => key in TASK_COLUMN_DEFS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusKey, setBulkStatusKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  if (tasks.length === 0) {
    return <p className={`${inCard ? "px-4 py-3" : "mt-8"} text-sm text-ink-muted`}>{emptyMessage}</p>;
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
    <div className={inCard ? "" : "mt-8"}>
      {selectedIds.size > 0 && (
        <div className="mb-3 flex min-h-12 flex-wrap items-center gap-3 rounded-3xl bg-select px-4 py-2 text-sm">
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
      {/* Téléphone : cartes. Le tri reste accessible par « Filtres et tri ». */}
      <ul className={`divide-y divide-line sm:hidden ${inCard ? "" : "-mx-4 border-y border-line"}`}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            statusOptions={statusOptions}
            selected={selectedIds.has(task.id)}
            onToggleSelect={() => toggleSelect(task.id)}
          />
        ))}
      </ul>
      {/* Bord à bord, comme la liste de Mail : le tableau annule les marges de
          la page et ses cellules extrêmes les reprennent. */}
      <div
        className={`hidden overflow-x-auto sm:block ${inCard ? "" : "-mx-4 border-y border-line sm:-mx-6 lg:-mx-8 2xl:-mx-12"}`}
      >
        <table className={`ws-list w-full border-collapse text-sm ${inCard ? "min-w-[560px]" : "min-w-[760px]"}`}>
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-ink-muted">
              <th className="w-8 py-2 pl-4 font-medium sm:pl-6 lg:pl-8 2xl:pl-12">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-accent"
                />
              </th>
              <th className="px-0 py-2">
                <span className="sr-only">Détails</span>
              </th>
              {[{ key: "tache", label: "Tâche", field: "tache" as TaskSortField, align: undefined }, ...shownColumns.map((key) => ({ key, ...TASK_COLUMN_DEFS[key] }))].map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-2 font-medium ${column.align === "right" ? "text-right" : ""}`}
                >
                  {column.field ? (
                    <Link
                      href={sortHref(column.field, sortField, sortDir, basePath, clientId, status)}
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
              {/* Marge de droite, alignée sur celle de la page. */}
              <th aria-hidden className="w-0 pr-0 sm:pr-2 lg:pr-4 2xl:pr-8" />
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
                columns={shownColumns}
                narrow={inCard}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
