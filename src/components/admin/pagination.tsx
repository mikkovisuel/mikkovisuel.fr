import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

// Pagination générique par page numérotée — voir la Documents/Tâches
// (2026-08-24, suite à un signalement de lenteur) : au-delà de quelques
// centaines de lignes, envoyer toute la liste en HTML fait grossir la page
// linéairement (mesuré : 1,5 Mo / 2,7 s pour 120 documents, dont la moitié
// est le payload d'hydratation React dupliqué). Conserve tous les
// paramètres d'URL existants (filtres, tri, recherche) en ne touchant que
// `page`.
export function Pagination({
  basePath,
  currentPage,
  totalPages,
  searchParams,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  const linkClass =
    "inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink";
  const disabledClass =
    "inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-ink-muted/40";

  return (
    <nav className="mt-8 flex items-center justify-center gap-4">
      {currentPage > 1 ? (
        <Link href={hrefFor(currentPage - 1)} className={linkClass}>
          <CaretLeft size={14} weight="bold" />
          Précédent
        </Link>
      ) : (
        <span className={disabledClass}>
          <CaretLeft size={14} weight="bold" />
          Précédent
        </span>
      )}
      <span className="text-sm text-ink-muted">
        Page {currentPage} / {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link href={hrefFor(currentPage + 1)} className={linkClass}>
          Suivant
          <CaretRight size={14} weight="bold" />
        </Link>
      ) : (
        <span className={disabledClass}>
          Suivant
          <CaretRight size={14} weight="bold" />
        </span>
      )}
    </nav>
  );
}
