import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

// Barre d'outils de page : le titre, un sous-titre discret et les commandes
// de la page sur une seule ligne, collée en haut de la feuille. Créée avec la
// refonte « macOS » (2026-10-14), redessinée pour la coquille « Workspace »
// (2026-10-20) : titre en Roboto 22 px régulier comme l'en-tête d'une liste
// Drive, fond de la feuille, simple filet dessous.
//
// Elle occupe toute la largeur : le contenu de la page vient dessous, dans
// `PAGE_BODY`. Sur téléphone, les commandes passent à la ligne au lieu de
// déborder.

/** Marges du contenu sous la barre d'outils, alignées sur celles de la barre. */
export const PAGE_BODY = "px-4 py-6 sm:px-6 lg:px-8 2xl:px-12";

export function PageToolbar({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  /** Compteur ou contexte, en gris à côté du titre (« 7 en cours »). */
  subtitle?: React.ReactNode;
  /** Lien de retour, affiché en chevron avant le titre (fiches). */
  back?: { href: string; label: string };
  /** Commandes de la page, alignées à droite. */
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-line bg-surface lg:rounded-t-2xl">
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex min-w-0 items-center gap-2">
          {back && (
            <Link
              href={back.href}
              aria-label={back.label}
              title={back.label}
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink"
            >
              <ArrowLeft size={20} />
            </Link>
          )}
          <h1 className="truncate text-[22px] font-normal leading-7 text-ink">{title}</h1>
          {subtitle && <span className="shrink-0 text-sm text-ink-muted">{subtitle}</span>}
        </div>
        {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
