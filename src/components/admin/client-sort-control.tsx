import Link from "next/link";
import { CaretUp, CaretDown } from "@phosphor-icons/react/dist/ssr";
import type { ClientSortField, ClientSortDir } from "@/lib/clients";

const FIELD_LABELS: Record<ClientSortField, string> = {
  nom: "Alphabétique",
  date_ajout: "Date d'ajout",
};

const SORT_FIELDS: ClientSortField[] = ["date_ajout", "nom"];

// Même pattern que `TaskSortControl` (dédié plutôt que généralisé, une seule
// page l'utilise) : liens `?tri=...&dir=...`, bascule croissant/décroissant
// en recliquant le champ déjà actif.
export function ClientSortControl({
  sortField,
  sortDir,
}: {
  sortField: ClientSortField;
  sortDir: ClientSortDir;
}) {
  function hrefFor(field: ClientSortField) {
    const nextDir: ClientSortDir = field === sortField && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams({ tri: field, dir: nextDir });
    return `/admin/clients?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-ink-muted">Trier par</span>
      {SORT_FIELDS.map((field) => {
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
