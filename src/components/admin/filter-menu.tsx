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
//
// `compact` (2026-10-14, barre d'outils macOS) : le bouton se réduit à son
// icône et au compteur de filtres actifs, le libellé passe en infobulle ; le
// panneau s'ouvre alors vers la gauche, puisque le bouton est en bout de
// barre, à droite de l'écran.
export function FilterMenu({
  activeCount = 0,
  label = "Filtres et tri",
  compact = false,
  children,
}: {
  activeCount?: number;
  label?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group relative inline-block">
      <summary
        title={compact ? label : undefined}
        aria-label={compact ? label : undefined}
        className={`inline-flex cursor-pointer list-none items-center gap-2 rounded-full border text-sm text-ink transition-colors [&::-webkit-details-marker]:hidden ${
          compact
            ? "h-8 border-transparent px-2 text-ink-muted hover:bg-ink/5 hover:text-ink"
            : "border-line px-4 py-2 hover:border-accent"
        }`}
      >
        <FunnelSimple size={16} weight="regular" />
        {!compact && label}
        {activeCount > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-ink">
            {activeCount}
          </span>
        )}
        {!compact && (
          <CaretDown
            size={12}
            weight="bold"
            className="text-ink-muted transition-transform group-open:rotate-180"
          />
        )}
      </summary>
      <div
        className={`absolute z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-elevated p-4 shadow-lg ${
          compact ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </details>
  );
}
