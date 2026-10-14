import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";

// Barre d'outils de page, refonte « macOS » du back-office (2026-10-14) : le
// titre, un sous-titre discret et les commandes de la page sur une seule
// ligne, collée en haut et bordée, comme la barre d'outils unifiée d'une
// application Mac (Mail, Finder). Elle remplace le grand titre suivi d'un
// bouton qui ouvrait chaque écran.
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
    <div className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-xl">
      <div className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex min-w-0 items-center gap-2">
          {back && (
            <Link
              href={back.href}
              aria-label={back.label}
              title={back.label}
              className="-ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <CaretLeft size={16} weight="bold" />
            </Link>
          )}
          <h1 className="truncate text-[17px] font-semibold text-ink">{title}</h1>
          {subtitle && <span className="shrink-0 text-[13px] text-ink-muted">{subtitle}</span>}
        </div>
        {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
