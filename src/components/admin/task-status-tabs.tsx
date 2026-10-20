import Link from "next/link";
import { PALETTE_SWATCH_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

// Onglets de statut au-dessus de la liste des tâches (refonte « Workspace »,
// livraison 2, 2026-10-20), comme les onglets Principale / Promotions de
// Gmail. Ils remplacent les statuts listés sous « Tâches » dans le tiroir et
// pilotent le même filtre `?status=` qu'avant : aucun nouveau comportement,
// seulement une place plus visible. « À traiter » = sans filtre (tout sauf
// Terminé, les terminées restant repliées sous la liste) — pas « En cours »,
// qui est déjà le nom d'un statut.

export function TaskStatusTabs({
  statuses,
  counts,
  openCount,
  current,
  params,
}: {
  statuses: { slug: string; label: string; color: string }[];
  counts: Record<string, number>;
  openCount: number;
  current?: string;
  /** Filtres à conserver d'un onglet à l'autre (client, recherche, tri…). */
  params: Record<string, string | undefined>;
}) {
  const hrefFor = (status?: string) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    if (status) search.set("status", status);
    const query = search.toString();
    return query ? `/admin/taches?${query}` : "/admin/taches";
  };

  const tabs = [
    { slug: undefined, label: "À traiter", color: null as string | null, count: openCount },
    ...statuses.map((status) => ({ ...status, count: counts[status.slug] ?? 0 })),
  ];

  return (
    <nav
      aria-label="Statuts"
      className="-mx-4 -mt-6 mb-4 flex overflow-x-auto border-b border-line [scrollbar-width:none] sm:-mx-6 lg:-mx-8 2xl:-mx-12"
    >
      {tabs.map((tab, index) => {
        const active = (current ?? undefined) === tab.slug;
        return (
          <Link
            key={tab.slug ?? "__a-traiter"}
            href={hrefFor(tab.slug)}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-12 shrink-0 items-center gap-2.5 px-4 text-sm transition-colors hover:bg-ink/[0.04] ${
              index === 0 ? "sm:pl-6 lg:pl-8 2xl:pl-12" : ""
            } ${active ? "font-medium text-ink" : "text-ink-muted"} ${tab.count === 0 && !active ? "opacity-60" : ""}`}
          >
            {tab.color && (
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  PALETTE_SWATCH_CLASSES[tab.color as PaletteColor] ?? PALETTE_SWATCH_CLASSES.slate
                }`}
              />
            )}
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  active ? "bg-accent text-accent-ink" : "bg-ink/[0.08] text-ink-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
            {/* Barre de l'onglet courant : 3 px arrondis en haut, comme Gmail. */}
            {active && (
              <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[3px] bg-[var(--color-accent-strong)]" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
