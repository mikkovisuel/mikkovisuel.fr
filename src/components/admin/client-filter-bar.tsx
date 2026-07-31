import Link from "next/link";
import { MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { PALETTE_BADGE_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

// Recherche en formulaire GET plutôt qu'en composant contrôlé : la page est
// un Server Component, l'état vit dans l'URL, et la recherche reste
// fonctionnelle sans JavaScript. Même parti pris que `ClientSortControl`.
//
// La recherche reste volontairement à l'air libre alors que les catégories
// et le tri sont repliés dans `FilterMenu` : taper un nom de client est le
// chemin le plus fréquent vers une fiche, l'enfouir sous un clic
// supplémentaire coûterait plus que le gain de place.
export function ClientFilterBar({
  search,
  categoryId,
  sortField,
  sortDir,
}: {
  search: string;
  categoryId: string;
  sortField: string;
  sortDir: string;
}) {
  // Le tri et la catégorie en cours sont conservés quand on relance une
  // recherche — sinon chaque recherche réinitialiserait discrètement l'ordre
  // et le filtre de la liste.
  function clearHref() {
    const params = new URLSearchParams({ tri: sortField, dir: sortDir });
    if (categoryId) params.set("categorie", categoryId);
    return `/admin/clients?${params.toString()}`;
  }

  return (
    <>
      <form method="GET" action="/admin/clients" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tri" value={sortField} />
        <input type="hidden" name="dir" value={sortDir} />
        {categoryId && <input type="hidden" name="categorie" value={categoryId} />}
        <div className="relative flex-1 sm:max-w-xs">
          <MagnifyingGlass
            size={16}
            weight="regular"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Nom du client, contact, email..."
            aria-label="Rechercher un client"
            className="w-full rounded-full border border-line bg-surface-elevated py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
        >
          Rechercher
        </button>
        {search && (
          <Link
            href={clearHref()}
            className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <X size={14} weight="bold" />
            Effacer
          </Link>
        )}
      </form>
    </>
  );
}

// Extrait de `ClientFilterBar` pour pouvoir vivre dans `FilterMenu` pendant
// que la recherche, elle, reste visible en permanence.
export function ClientCategoryFilter({
  search,
  categoryId,
  sortField,
  sortDir,
  categories,
  uncategorizedCount,
}: {
  search: string;
  categoryId: string;
  sortField: string;
  sortDir: string;
  categories: { id: string; label: string; color: string; count: number }[];
  uncategorizedCount: number;
}) {
  function hrefForCategory(nextCategoryId: string) {
    const params = new URLSearchParams({ tri: sortField, dir: sortDir });
    if (search) params.set("q", search);
    if (nextCategoryId) params.set("categorie", nextCategoryId);
    return `/admin/clients?${params.toString()}`;
  }

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors";

  return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-ink-muted">Catégorie</span>
        <Link
          href={hrefForCategory("")}
          className={`${chipBase} ${
            categoryId ? "border-line text-ink-muted hover:text-ink" : "border-accent bg-accent/10 text-ink"
          }`}
        >
          Toutes
        </Link>
        {categories.map((category) => {
          const isActive = categoryId === category.id;
          return (
            <Link
              key={category.id}
              href={hrefForCategory(category.id)}
              className={`${chipBase} ${
                isActive
                  ? PALETTE_BADGE_CLASSES[category.color as PaletteColor]
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              {category.label}
              <span className="text-xs opacity-70">{category.count}</span>
            </Link>
          );
        })}
        {uncategorizedCount > 0 && (
          <Link
            href={hrefForCategory("aucune")}
            className={`${chipBase} ${
              categoryId === "aucune"
                ? "border-accent bg-accent/10 text-ink"
                : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            Non catégorisés
            <span className="text-xs opacity-70">{uncategorizedCount}</span>
          </Link>
        )}
    </div>
  );
}
