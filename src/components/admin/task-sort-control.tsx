import Link from "next/link";
import { CaretUp, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { TASK_SORT_FIELDS, type TaskSortField, type TaskSortDir } from "@/lib/tasks";

const FIELD_LABELS: Record<TaskSortField, string> = {
  evenement: "Évènement",
  echeance: "Échéance",
  client: "Client",
  tache: "Tâche",
  statut: "Statut",
};

// Contrôle de tri générique, réutilisé par toutes les vues admin/taches
// (pas seulement `TaskTable`, qui a ses propres en-têtes cliquables) et par
// la page client individuelle. Construit des liens `?tri=...&dir=...` en
// conservant les autres paramètres déjà présents dans l'URL (vue, filtres).
export function TaskSortControl({
  basePath,
  sortField,
  sortDir,
  extraParams = {},
}: {
  basePath: string;
  sortField: TaskSortField;
  sortDir: TaskSortDir;
  extraParams?: Record<string, string | undefined>;
}) {
  function hrefFor(field: TaskSortField) {
    const nextDir: TaskSortDir = field === sortField && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
    params.set("tri", field);
    params.set("dir", nextDir);
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-ink-muted">Trier par</span>
      {TASK_SORT_FIELDS.map((field) => {
        const isActive = field === sortField;
        return (
          <Link
            key={field}
            href={hrefFor(field)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition-colors ${
              isActive
                ? "border-accent bg-accent/10 text-ink"
                : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            {FIELD_LABELS[field]}
            {isActive &&
              (sortDir === "asc" ? (
                <CaretUp size={11} weight="bold" />
              ) : (
                <CaretDown size={11} weight="bold" />
              ))}
          </Link>
        );
      })}
    </div>
  );
}
