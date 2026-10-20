"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AddressBook,
  CalendarBlank,
  ChatCircleText,
  CheckSquare,
  FileText,
  House,
  Images,
  NotePencil,
  Target,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { NAV_ITEMS } from "@/lib/admin-preferences";

// Navigation du back-office, dans le tiroir de la coquille « Workspace »
// (2026-10-20, voir `workspace-shell.tsx`).
//
// Historique : barre horizontale, puis barre latérale « macOS » regroupée par
// usage (2026-10-14). Avec la refonte Workspace, les rubriques deviennent des
// pilules à la manière de Gmail et de Drive, et les écrans de configuration
// retournent derrière la roue crantée de la barre du haut, comme les
// paramètres des applications Google. Le tiroir peut se réduire à une
// colonne d'icônes (`rail`).
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
];

export type NavBadges = Partial<Record<string, number>>;

/** Réglages « Mon affichage » du tiroir (2026-10-20). */
export interface NavPreferences {
  /** Clés de `NAV_ITEMS` dans l'ordre choisi (l'ordre joue dans chaque groupe). */
  order: string[];
  hidden: string[];
  counters: boolean;
  clientShortcuts: boolean;
}

const keyOf = (href: string) => NAV_ITEMS.find((item) => item.href === href)?.key ?? href;

/** Groupes du tiroir après masquage et réordonnancement. */
function arrangedGroups(preferences?: NavPreferences) {
  if (!preferences) return NAV_GROUPS;
  const rank = (href: string) => {
    const index = preferences.order.indexOf(keyOf(href));
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => !preferences.hidden.includes(keyOf(item.href)))
      .sort((a, b) => rank(a.href) - rank(b.href)),
  })).filter((group) => group.items.length > 0);
}

/** Raccourcis affichés sous « Tâches » : filtre client existant de la page. */
export interface TaskShortcuts {
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

function Badge({ count, rail }: { count: number | undefined; rail?: boolean }) {
  if (!count || count <= 0) return null;
  if (rail) {
    return (
      <span className="absolute right-1 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink tabular-nums">
        {count}
      </span>
    );
  }
  return <span className="ml-auto pl-2 text-xs font-semibold tabular-nums">{count}</span>;
}

// Pilule de navigation à la Gmail : 32 px de haut (densité compacte),
// sélection en jaune clair et en gras.
// Comme Gmail, la pilule est collée au bord gauche du tiroir (arrondie à
// droite seulement) ; réduite en icônes, elle redevient une pilule entière.
const ITEM = "flex h-8 items-center gap-4 text-sm transition-colors";
const itemState = (selected: boolean) =>
  selected ? "bg-select font-bold text-ink" : "text-ink hover:bg-ink/[0.08]";

/** Navigation du tiroir. `rail` : tiroir réduit à une colonne d'icônes. */
export function AdminSidebarNav({
  badges,
  taskShortcuts,
  rail = false,
  preferences,
}: {
  badges: NavBadges;
  taskShortcuts?: TaskShortcuts;
  rail?: boolean;
  preferences?: NavPreferences;
}) {
  const groups = arrangedGroups(preferences);
  const showCounters = preferences?.counters ?? true;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const onTasks = pathname === "/admin/taches";
  const clientFilter = onTasks ? searchParams.get("clientId") : null;
  // « Tâches » n'est surligné que sans filtre client : quand un client est
  // choisi, c'est son raccourci qui porte la sélection. Les statuts, listés
  // ici jusqu'au 2026-10-20, sont devenus les onglets de la liste
  // (`task-status-tabs.tsx`).
  const filtered = Boolean(clientFilter);
  const showShortcuts = onTasks && !rail && (preferences?.clientShortcuts ?? true) && taskShortcuts;

  // Sur un écran bas, la liste défile : la rubrique active est ramenée
  // dans le champ à chaque changement de page.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Navigation principale" className="flex flex-col">
      {groups.map((group, groupIndex) => (
        <div key={group.title ?? "accueil"} className="flex flex-col">
          {group.title &&
            (rail ? (
              groupIndex > 0 && <hr className="mx-3 my-2 border-line" />
            ) : (
              <p className="pb-1 pl-6 pt-4 text-xs font-medium text-ink-muted">{group.title}</p>
            ))}
          {group.items.map(({ href, label, icon: ItemIcon }) => {
            const active = isActive(pathname, href);
            const highlighted = active && !(href === "/admin/taches" && filtered);
            return (
              <div key={href} className="flex flex-col">
                <Link
                  ref={active ? activeRef : undefined}
                  href={href}
                  aria-current={highlighted ? "page" : undefined}
                  aria-label={rail ? label : undefined}
                  title={rail ? label : undefined}
                  className={`${ITEM} ${itemState(highlighted)} ${
                    rail ? "relative mx-auto w-14 justify-center rounded-full" : "rounded-r-full pl-6 pr-4"
                  }`}
                >
                  <ItemIcon size={20} weight={active ? "fill" : "regular"} className="shrink-0" />
                  {!rail && <span className="truncate">{label}</span>}
                  {showCounters && <Badge count={badges[href]} rail={rail} />}
                </Link>
              </div>
            );
          })}
          {/* Clients ayant des tâches en cours, après le groupe Production. */}
          {group.title === "Production" && showShortcuts && taskShortcuts.clients.length > 0 && (
            <div className="flex flex-col">
              <p className="pb-1 pl-6 pt-4 text-xs font-medium text-ink-muted">Clients</p>
              {taskShortcuts.clients.map((client, index) => (
                <Link
                  key={client.id}
                  href={`/admin/taches?clientId=${client.id}`}
                  aria-current={clientFilter === client.id ? "page" : undefined}
                  className={`${ITEM} ${itemState(clientFilter === client.id)} rounded-r-full pl-6 pr-4`}
                >
                  <span className={`mx-[5px] h-2.5 w-2.5 shrink-0 rounded-full ${CLIENT_DOTS[index % CLIENT_DOTS.length]}`} />
                  <span className="truncate">{client.name}</span>
                  <span className="ml-auto text-xs tabular-nums text-ink-muted">{client.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
