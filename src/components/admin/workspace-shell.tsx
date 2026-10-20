"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Plus, X } from "@phosphor-icons/react/dist/ssr";
import { BrandLogo } from "@/components/brand-logo";
import { GlobalSearchBar } from "@/components/admin/global-search-bar";
import { AdminSidebarNav, type NavBadges, type TaskShortcuts } from "@/components/admin/admin-nav";

// Coquille « Workspace » du back-office (2026-10-20), à la manière de Gmail,
// Drive et Agenda : barre du haut avec la recherche en pilule, tiroir de
// navigation à gauche, contenu sur une feuille blanche arrondie posée sur le
// fond gris-bleu.
//
// Sur ordinateur (lg et plus), la page ne défile pas : seule la feuille
// défile, la barre et le tiroir restent en place. Le bouton « menu » réduit
// le tiroir à une colonne d'icônes, choix mémorisé dans le navigateur. Sous
// `lg`, la page défile normalement (la barre d'adresse du téléphone se replie)
// et le tiroir s'ouvre par-dessus le contenu.

const RAIL_KEY = "admin-drawer-rail";

/** Créations proposées par le bouton « Nouveau », comme le menu de Drive.
 * Celle de la rubrique courante passe en tête. */
const CREATE_ENTRIES = [
  { section: "/admin/taches", href: "/admin/taches/nouveau", label: "Nouvelle tâche" },
  { section: "/admin/clients", href: "/admin/clients/nouveau", label: "Nouveau client" },
  { section: "/admin/prospection", href: "/admin/prospection/nouveau", label: "Nouveau prospect" },
  { section: "/admin/reseaux", href: "/admin/reseaux/nouveau", label: "Nouvelle publication" },
];

function orderedEntries(pathname: string) {
  const current = CREATE_ENTRIES.find((entry) => pathname.startsWith(entry.section));
  return current ? [current, ...CREATE_ENTRIES.filter((entry) => entry !== current)] : CREATE_ENTRIES;
}

function NewButton({ rail }: { rail: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const entries = orderedEntries(pathname);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" onKeyDown={(event) => event.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Nouveau"
        title={rail ? "Nouveau" : undefined}
        className={`flex h-14 items-center gap-3 rounded-2xl bg-accent font-medium text-accent-ink shadow-[0_1px_2px_rgba(0,0,0,0.3),0_1px_3px_1px_rgba(0,0,0,0.15)] transition-shadow hover:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_8px_3px_rgba(0,0,0,0.15)] ${
          rail ? "w-14 justify-center" : "pl-4 pr-6"
        }`}
      >
        <Plus size={22} weight="bold" className="shrink-0" />
        {!rail && <span className="text-sm">Nouveau</span>}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-40 mt-2 w-60 overflow-hidden rounded-lg bg-surface py-2 shadow-lg"
        >
          {entries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-10 items-center px-4 text-sm text-ink transition-colors hover:bg-ink/[0.08]"
            >
              {entry.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceShell({
  badges,
  taskShortcuts,
  timer,
  actions,
  children,
}: {
  badges: NavBadges;
  taskShortcuts: TaskShortcuts;
  /** Chronomètre en cours, s'il y en a un. */
  timer?: React.ReactNode;
  /** Icônes à droite de la barre du haut (thème, réglages, déconnexion, compte). */
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [rail, setRail] = useState(false);
  // Le tiroir du téléphone est ouvert *pour une page* : changer de page le
  // referme sans effet à synchroniser (même schéma que l'ancien menu).
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const mobileOpen = openedOn === pathname;

  useEffect(() => {
    // Préférence lue après le montage : le serveur ne connaît pas le
    // stockage du navigateur.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRail(localStorage.getItem(RAIL_KEY) === "1");
    } catch {
      /* stockage indisponible : tiroir déplié */
    }
  }, []);

  function toggleMenu() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      const next = !rail;
      setRail(next);
      try {
        localStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {
        /* rien à faire */
      }
    } else {
      setOpenedOn(mobileOpen ? null : pathname);
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 px-2 sm:px-3">
        <div className="ws-icons flex items-center">
          <button
            type="button"
            onClick={toggleMenu}
            aria-label="Menu principal"
            aria-expanded={mobileOpen || undefined}
            title="Menu principal"
          >
            <List size={22} />
          </button>
        </div>
        <Link href="/admin" className="flex shrink-0 items-center gap-2 pr-2 lg:w-[200px]">
          <BrandLogo className="h-6" />
          <span className="text-[22px] leading-none text-ink-muted">Admin</span>
        </Link>
        <div className="hidden min-w-0 max-w-[720px] flex-1 md:block">
          <GlobalSearchBar variant="workspace" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          {timer && <div className="hidden md:block">{timer}</div>}
          <div className="ws-icons flex items-center gap-0.5">{actions}</div>
        </div>
      </header>
      {timer && <div className="px-4 pb-2 md:hidden">{timer}</div>}

      <div className="flex flex-1 lg:min-h-0">
        <aside
          className={`hidden shrink-0 flex-col lg:flex ${rail ? "w-[72px] items-center" : "w-64"}`}
          aria-label="Tiroir de navigation"
        >
          <div className={`pb-4 pt-1 ${rail ? "" : "pl-2"}`}>
            <NewButton rail={rail} />
          </div>
          <div className={`flex-1 overflow-y-auto pb-4 ${rail ? "w-full px-2" : "pr-3"}`}>
            <AdminSidebarNav badges={badges} taskShortcuts={taskShortcuts} rail={rail} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-surface lg:mb-4 lg:mr-4 lg:overflow-y-auto lg:rounded-2xl">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpenedOn(null)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-canvas shadow-lg">
            <div className="flex h-16 items-center gap-2 px-3">
              <div className="ws-icons flex">
                <button type="button" onClick={() => setOpenedOn(null)} aria-label="Fermer le menu">
                  <X size={20} />
                </button>
              </div>
              <BrandLogo className="h-6" />
              <span className="text-[22px] leading-none text-ink-muted">Admin</span>
            </div>
            <div className="px-3 pb-3">
              <GlobalSearchBar variant="workspace" />
            </div>
            <div className="px-3 pb-3">
              <NewButton rail={false} />
            </div>
            <div className="flex-1 overflow-y-auto pb-4 pr-3">
              <AdminSidebarNav badges={badges} taskShortcuts={taskShortcuts} rail={false} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
