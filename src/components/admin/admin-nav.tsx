"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { GlobalSearchBar } from "@/components/admin/global-search-bar";

// Navigation du back-office (2026-10-14). Deux défauts corrigés :
// - aucune rubrique n'était jamais signalée comme active ;
// - sur téléphone, dix liens tenaient sur une ligne qui défilait sans le
//   montrer : la rubrique courante sortait souvent de l'écran.
// Sur téléphone, un bouton affiche donc la rubrique courante et déplie la
// liste complète, avec la recherche globale (masquée dans l'en-tête faute de
// place). Au-delà, la barre horizontale d'avant, avec la rubrique active
// soulignée et ramenée dans le champ.

export interface AdminNavLink {
  href: string;
  label: string;
  badge: number;
}

function isActive(pathname: string, href: string) {
  // Le tableau de bord est la racine : sans comparaison stricte, il serait
  // « actif » sur toutes les pages.
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-ink">
      {count}
    </span>
  );
}

export function AdminNav({ links }: { links: AdminNavLink[] }) {
  const pathname = usePathname();
  // Le menu est ouvert *pour une page* : changer de page le referme sans
  // effet ni état à resynchroniser.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuOpen = openedOn === pathname;
  const activeRef = useRef<HTMLAnchorElement>(null);
  const current = links.find((link) => isActive(pathname, link.href));

  // Barre horizontale : quand la fenêtre est trop étroite pour les dix
  // rubriques, la rubrique active est ramenée dans le champ.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <>
      {/* Téléphone */}
      <div className="px-4 pb-3 sm:hidden">
        <button
          type="button"
          onClick={() => setOpenedOn(menuOpen ? null : pathname)}
          aria-expanded={menuOpen}
          aria-controls="admin-nav-menu"
          className="flex w-full items-center justify-between gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink"
        >
          <span className="flex items-center gap-1.5">
            {current?.label ?? "Menu"}
            {current && <Badge count={current.badge} />}
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className={`text-ink-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>
        {menuOpen && (
          <div id="admin-nav-menu" className="mt-3 grid gap-3">
            <GlobalSearchBar />
            <nav className="grid grid-cols-2 gap-2">
              {links.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-line text-ink hover:border-accent"
                    }`}
                  >
                    {link.label}
                    {!active && <Badge count={link.badge} />}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Tablette et ordinateur */}
      <nav className="hidden gap-6 overflow-x-auto px-4 sm:flex sm:px-6 lg:px-8 2xl:px-12">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              ref={active ? activeRef : undefined}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 text-sm transition-colors ${
                active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {link.label}
              <Badge count={link.badge} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
