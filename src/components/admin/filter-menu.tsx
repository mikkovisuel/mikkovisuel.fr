import { FunnelSimple, CaretDown } from "@phosphor-icons/react/dist/ssr";

// Repli des filtres et du tri derrière un seul bouton, sur toutes les vues
// listes de l'admin — auparavant chaque page étalait 3 à 6 contrôles en
// permanence, qui repoussaient la liste elle-même vers le bas.
//
// Bâti sur `<details>/<summary>` natif plutôt qu'un état React : ces pages
// sont des Server Components dont l'état vit dans l'URL (même parti pris
// que `ClientFilterBar`/`TaskSortControl`), donc le menu n'a besoin
// d'aucun JavaScript — il s'ouvre, se ferme et se referme tout seul à la
// navigation qui suit la validation du formulaire.
//
// `activeCount` est le nombre de filtres réellement appliqués : replier les
// contrôles ne doit jamais cacher le fait qu'une liste est filtrée, sinon
// on regarde un sous-ensemble en croyant voir le tout.
export function FilterMenu({
  activeCount = 0,
  label = "Filtres et tri",
  children,
}: {
  activeCount?: number;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group relative inline-block">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent [&::-webkit-details-marker]:hidden">
        <FunnelSimple size={16} weight="regular" />
        {label}
        {activeCount > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-ink">
            {activeCount}
          </span>
        )}
        <CaretDown
          size={12}
          weight="bold"
          className="text-ink-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="absolute left-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-elevated p-4 shadow-lg">
        {children}
      </div>
    </details>
  );
}
