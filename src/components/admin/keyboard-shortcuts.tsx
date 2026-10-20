"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Modal } from "@/components/admin/modal";

// Raccourcis clavier du back-office (feuille de route, point 3, 2026-10-20),
// sur le modèle de Gmail :
//   ⌘K / Ctrl+K ou /   rechercher
//   n                  créer (selon la rubrique : tâche, client, prospect,
//                      publication)
//   j / ↓, k / ↑       ligne suivante / précédente d'une liste
//   Entrée ou o        ouvrir la ligne choisie
//   x                  cocher la ligne choisie
//   g puis t, c, r, a, p, d  aller aux Tâches, Clients, Réseaux,
//                      Administratif, Prospection, Tableau de bord
//   ?                  aide
// Rien ne se déclenche pendant la saisie dans un champ.

const CREATE_BY_SECTION: [string, string][] = [
  ["/admin/clients", "/admin/clients/nouveau"],
  ["/admin/prospection", "/admin/prospection/nouveau"],
  ["/admin/reseaux", "/admin/reseaux/nouveau"],
  ["/admin/taches", "/admin/taches/nouveau"],
];

const GO_TO: Record<string, string> = {
  t: "/admin/taches",
  c: "/admin/clients",
  r: "/admin/reseaux",
  a: "/admin/administratif",
  p: "/admin/prospection",
  d: "/admin",
};

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘ K", "/"], label: "Rechercher" },
  { keys: ["n"], label: "Créer (tâche, client, prospect ou publication selon la page)" },
  { keys: ["j", "↓"], label: "Ligne suivante d'une liste" },
  { keys: ["k", "↑"], label: "Ligne précédente" },
  { keys: ["Entrée", "o"], label: "Ouvrir la ligne choisie" },
  { keys: ["x"], label: "Cocher la ligne choisie" },
  { keys: ["g", "t"], label: "Aller aux Tâches" },
  { keys: ["g", "c"], label: "Aller aux Clients" },
  { keys: ["g", "r"], label: "Aller aux Réseaux" },
  { keys: ["g", "a"], label: "Aller à Administratif" },
  { keys: ["g", "p"], label: "Aller à Prospection" },
  { keys: ["g", "d"], label: "Aller au Tableau de bord" },
  { keys: ["?"], label: "Afficher cette aide" },
];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.closest("dialog[open]") !== null
  );
}

/** Lignes des listes navigables : celles des tableaux `ws-list`, visibles. */
function listRows() {
  return [...document.querySelectorAll<HTMLTableRowElement>("table.ws-list tbody tr")].filter(
    (row) => row.offsetParent !== null && row.querySelector("a[href]"),
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingG = useRef<number | null>(null);
  const activeIndex = useRef(-1);

  // Nouvelle page : plus de ligne choisie.
  useEffect(() => {
    activeIndex.current = -1;
  }, [pathname]);

  useEffect(() => {
    function highlight(index: number) {
      const rows = listRows();
      if (rows.length === 0) return;
      const next = Math.max(0, Math.min(index, rows.length - 1));
      rows.forEach((row) => row.removeAttribute("data-kb-active"));
      rows[next].setAttribute("data-kb-active", "");
      rows[next].scrollIntoView({ block: "nearest" });
      activeIndex.current = next;
    }

    function onKeyDown(event: KeyboardEvent) {
      // ⌘K / Ctrl+K marche partout, même dans un champ.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const href = GO_TO[event.key];
        if (href) {
          event.preventDefault();
          router.push(href);
        }
        return;
      }

      switch (event.key) {
        case "/":
          event.preventDefault();
          focusSearch();
          break;
        case "?":
          event.preventDefault();
          setHelpOpen(true);
          break;
        case "g":
          pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
          break;
        case "n": {
          event.preventDefault();
          const target = CREATE_BY_SECTION.find(([section]) => pathname.startsWith(section))?.[1];
          router.push(target ?? "/admin/taches/nouveau");
          break;
        }
        case "j":
        case "ArrowDown":
          if (listRows().length === 0) return;
          event.preventDefault();
          highlight(activeIndex.current + 1);
          break;
        case "k":
        case "ArrowUp":
          if (listRows().length === 0 || activeIndex.current < 0) return;
          event.preventDefault();
          highlight(activeIndex.current - 1);
          break;
        case "Enter":
        case "o": {
          const row = listRows()[activeIndex.current];
          if (!row) return;
          event.preventDefault();
          row.querySelector<HTMLAnchorElement>("a[href]")?.click();
          break;
        }
        case "x": {
          const row = listRows()[activeIndex.current];
          const box = row?.querySelector<HTMLInputElement>('input[type="checkbox"]');
          if (!box) return;
          event.preventDefault();
          box.click();
          break;
        }
      }
    }

    function focusSearch() {
      const inputs = [...document.querySelectorAll<HTMLInputElement>("input[data-admin-search]")];
      const visible = inputs.find((input) => input.offsetParent !== null);
      if (visible) {
        visible.focus();
        visible.select();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  return (
    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Raccourcis clavier">
      <ul className="grid gap-2 text-sm">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.label} className="flex items-center gap-4">
            <span className="flex w-36 shrink-0 items-center gap-1">
              {shortcut.keys.map((key, index) => (
                <span key={key} className="flex items-center gap-1">
                  {index > 0 && <span className="text-xs text-ink-muted">{shortcut.keys[0] === "g" ? "puis" : "ou"}</span>}
                  <kbd className="min-w-7 rounded-md border border-line bg-surface-elevated px-1.5 py-0.5 text-center font-sans text-xs text-ink">
                    {key}
                  </kbd>
                </span>
              ))}
            </span>
            <span className="text-ink">{shortcut.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-muted">Les raccourcis ne se déclenchent pas pendant la saisie dans un champ.</p>
    </Modal>
  );
}
