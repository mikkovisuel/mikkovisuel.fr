"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AddressBook,
  CalendarBlank,
  CaretDown,
  ChatCircleText,
  CheckSquare,
  DownloadSimple,
  FileText,
  House,
  Images,
  ListBullets,
  NotePencil,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { GlobalSearchBar } from "@/components/admin/global-search-bar";
import { PALETTE_SWATCH_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

// Navigation du back-office.
//
// 2026-10-14 (matin) : rubrique active signalée, menu dédié sur téléphone.
// 2026-10-14 (soir), refonte « macOS » : sur ordinateur, la barre horizontale
// devient une barre latérale à la manière du Finder ou de Mail, regroupée par
// usage. Les écrans de configuration, rangés jusqu'ici derrière la roue
// crantée faute de place dans la barre horizontale, y deviennent un groupe à
// part entière. Sous `lg`, le bouton « rubrique courante » d'avant reste en
// place : une barre de 240 px mangerait la moitié d'un téléphone.
//
// Les icônes vivent ici plutôt que dans le layout : un composant serveur ne
// peut pas passer de composant (une fonction) à un composant client. Le
// layout ne transmet donc que les compteurs.

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

const NAV_GROUPS: { title: string | null; items: NavItem[] }[] = [
  { title: null, items: [{ href: "/admin", label: "Tableau de bord", icon: House }] },
  {
    title: "Relation client",
    items: [
      { href: "/admin/clients", label: "Clients", icon: Users },
      { href: "/admin/contacts", label: "Contacts", icon: AddressBook },
      { href: "/admin/prospection", label: "Prospection", icon: Target },
    ],
  },
  {
    title: "Production",
    items: [
      { href: "/admin/taches", label: "Tâches", icon: CheckSquare },
      { href: "/admin/reseaux", label: "Réseaux", icon: ChatCircleText },
      { href: "/admin/planning", label: "Planning", icon: CalendarBlank },
    ],
  },
  {
    title: "Gestion",
    items: [
      { href: "/admin/administratif", label: "Administratif", icon: FileText },
      { href: "/admin/notes", label: "Notes", icon: NotePencil },
      { href: "/admin/portfolio", label: "Portfolio", icon: Images },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/admin/reglages", label: "Réglages", icon: SlidersHorizontal },
      { href: "/admin/listes", label: "Listes déroulantes", icon: ListBullets },
      { href: "/admin/exports", label: "Exports", icon: DownloadSimple },
      { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
    ],
  },
];

/** Rubriques du travail quotidien : le menu téléphone n'affiche pas la
 * configuration, qui reste derrière la roue crantée de l'en-tête. */
const DAILY_ITEMS = NAV_GROUPS.filter((group) => group.title !== "Configuration").flatMap(
  (group) => group.items,
);

export type NavBadges = Partial<Record<string, number>>;

/** Raccourcis affichés sous « Tâches » : filtres existants de la page. */
export interface TaskShortcuts {
  statuses: { slug: string; label: string; color: string; count: number }[];
  clients: { id: string; name: string; count: number }[];
}

// Pastilles de couleur des clients : rotation fixe, pour qu'un même client
// garde sa couleur d'une page à l'autre tant que l'ordre ne change pas.
const CLIENT_DOTS = ["bg-orange-400", "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-teal-500", "bg-amber-500", "bg-indigo-500"];

function isActive(pathname: string, href: string) {
  // Le tableau de bord est la racine : sans comparaison stricte, il serait
  // « actif » sur toutes les pages.
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ count }: { count: number | undefined }) {
  if (!count || count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] font-bold text-accent-ink tabular-nums">
      {count}
    </span>
  );
}

/** Barre latérale, ordinateur (lg et plus). */
export function AdminSidebarNav({ badges, taskShortcuts }: { badges: NavBadges; taskShortcuts?: TaskShortcuts }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const onTasks = pathname === "/admin/taches";
  const statusFilter = onTasks ? searchParams.get("status") : null;
  const clientFilter = onTasks ? searchParams.get("clientId") : null;
  // « Tâches » n'est surligné que sans filtre : quand un statut ou un client
  // est choisi, c'est son raccourci qui porte la sélection.
  const filtered = Boolean(statusFilter || clientFilter);

  const subItem = (href: string, active: boolean, children: React.ReactNode) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-7 items-center gap-2 rounded-md pl-8 pr-2.5 text-[13px] transition-colors ${
        active ? "bg-ink/10 font-medium text-ink" : "text-ink hover:bg-ink/5"
      }`}
    >
      {children}
    </Link>
  );

  // Sur un écran bas, la liste défile : la rubrique active est ramenée
  // dans le champ à chaque changement de page.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title ?? "accueil"} className="flex flex-col gap-0.5">
          {group.title && (
            <p className="px-2.5 pb-1 pt-4 text-[11px] font-semibold text-ink-muted">{group.title}</p>
          )}
          {group.items.map(({ href, label, icon: ItemIcon }) => {
            const active = isActive(pathname, href);
            const highlighted = active && !(href === "/admin/taches" && filtered);
            return (
              <div key={href} className="flex flex-col gap-0.5">
                <Link
                  ref={active ? activeRef : undefined}
                  href={href}
                  aria-current={highlighted ? "page" : undefined}
                  className={`flex h-7 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors ${
                    highlighted ? "bg-ink/10 font-medium text-ink" : "text-ink hover:bg-ink/5"
                  }`}
                >
                  <ItemIcon size={16} weight={active ? "fill" : "regular"} className="shrink-0 text-ink-muted" />
                  <span className="truncate">{label}</span>
                  <Badge count={badges[href]} />
                </Link>
                {/* Statuts sous « Tâches », comme les sous-dossiers de Mail. */}
                {href === "/admin/taches" &&
                  onTasks &&
                  taskShortcuts?.statuses.map((item) =>
                    subItem(
                      `/admin/taches?status=${item.slug}`,
                      statusFilter === item.slug,
                      <>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            PALETTE_SWATCH_CLASSES[item.color as PaletteColor] ?? PALETTE_SWATCH_CLASSES.slate
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                        <span className="ml-auto text-[11px] tabular-nums text-ink-muted">{item.count}</span>
                      </>,
                    ),
                  )}
              </div>
            );
          })}
          {/* Clients ayant des tâches en cours, après le groupe Production. */}
          {group.title === "Production" && onTasks && taskShortcuts && taskShortcuts.clients.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="px-2.5 pb-1 pt-4 text-[11px] font-semibold text-ink-muted">Clients</p>
              {taskShortcuts.clients.map((client, index) => (
                <Link
                  key={client.id}
                  href={`/admin/taches?clientId=${client.id}`}
                  aria-current={clientFilter === client.id ? "page" : undefined}
                  className={`flex h-7 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors ${
                    clientFilter === client.id ? "bg-ink/10 font-medium text-ink" : "text-ink hover:bg-ink/5"
                  }`}
                >
                  <span className={`mx-1 h-2 w-2 shrink-0 rounded-full ${CLIENT_DOTS[index % CLIENT_DOTS.length]}`} />
                  <span className="truncate">{client.name}</span>
                  <span className="ml-auto text-[11px] tabular-nums text-ink-muted">{client.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

/** Bouton « rubrique courante » et menu déroulant, téléphone et tablette. */
export function AdminMobileNav({ badges }: { badges: NavBadges }) {
  const pathname = usePathname();
  // Le menu est ouvert *pour une page* : changer de page le referme sans
  // effet ni état à resynchroniser.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuOpen = openedOn === pathname;
  const current = NAV_GROUPS.flatMap((group) => group.items).find((item) => isActive(pathname, item.href));

  return (
    <div className="px-4 pb-3 sm:px-6 lg:hidden">
      <button
        type="button"
        onClick={() => setOpenedOn(menuOpen ? null : pathname)}
        aria-expanded={menuOpen}
        aria-controls="admin-nav-menu"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface-elevated px-3.5 py-2 text-sm font-medium text-ink"
      >
        <span className="flex items-center gap-2">
          {current && <current.icon size={16} weight="fill" className="text-ink-muted" />}
          {current?.label ?? "Menu"}
          {current && <Badge count={badges[current.href]} />}
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
            {DAILY_ITEMS.map(({ href, label, icon: ItemIcon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    active ? "border-accent bg-accent text-accent-ink" : "border-line text-ink hover:border-accent"
                  }`}
                >
                  <ItemIcon size={16} weight={active ? "fill" : "regular"} className="shrink-0" />
                  <span className="truncate">{label}</span>
                  {!active && <Badge count={badges[href]} />}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
