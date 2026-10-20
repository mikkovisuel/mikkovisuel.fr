"use client";

import { useRouter } from "next/navigation";
import { CaretDown, Check, X } from "@phosphor-icons/react/dist/ssr";

// Puces de filtre à la manière de Google Drive (refonte « Workspace »,
// livraison 3, 2026-10-20) : une puce par critère, son menu est un `<select>`
// natif posé par-dessus (clavier, lecteur d'écran et téléphone gratuits). Une
// puce active passe en jaune clair et cochée. Changer un filtre recharge la
// page avec les mêmes paramètres d'URL qu'avant, et revient à la première page.

export interface ChipFilter {
  name: string;
  label: string;
  /** Libellé de l'option « tous ». */
  allLabel: string;
  options: { value: string; label: string }[];
}

export function FilterChips({
  basePath,
  params,
  filters,
  keepOnReset = [],
}: {
  basePath: string;
  /** Paramètres d'URL actuels, à conserver. */
  params: Record<string, string | undefined>;
  filters: ChipFilter[];
  /** Paramètres gardés par « Effacer les filtres » (vue, autres sections). */
  keepOnReset?: string[];
}) {
  const router = useRouter();

  function go(next: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) search.set(key, value);
    search.delete("page");
    const query = search.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  const active = filters.filter((filter) => params[filter.name]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => {
        const value = params[filter.name] ?? "";
        const selected = filter.options.find((option) => option.value === value);
        return (
          <label
            key={filter.name}
            className={`relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
              selected
                ? "border-transparent bg-select text-ink"
                : "border-[var(--color-outline)] text-ink hover:bg-ink/[0.04]"
            }`}
          >
            {selected && <Check size={16} weight="bold" />}
            <span className="max-w-[12rem] truncate">{selected ? selected.label : filter.label}</span>
            <CaretDown size={14} weight="fill" className="text-ink-muted" />
            <select
              aria-label={filter.label}
              value={value}
              onChange={(event) => go({ ...params, [filter.name]: event.target.value || undefined })}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      {active.length > 0 && (
        <button
          type="button"
          onClick={() =>
            go(Object.fromEntries(keepOnReset.map((key) => [key, params[key]])))
          }
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
        >
          <X size={14} weight="bold" />
          Effacer les filtres
        </button>
      )}
    </div>
  );
}
