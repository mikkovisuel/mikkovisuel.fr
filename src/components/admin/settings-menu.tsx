"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GearSix, SlidersHorizontal, ListBullets, DownloadSimple, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

// Regroupe sous la roue crantée les écrans de configuration et de
// consultation qui encombraient la navigation principale (demande du client
// du 2026-07-31) : "Listes", "Exports" et "Audit" en sont retirés, ce qui
// ramène la barre de 13 à 10 onglets.
//
// Le critère de tri retenu : la barre principale garde le travail quotidien
// (clients, tâches, documents, finances...), la roue reçoit ce qu'on ouvre
// rarement — paramétrage, extraction ponctuelle, journal de sécurité.
//
// Composant client, contrairement à `FilterMenu` qui est un `<details>`
// serveur : un menu de navigation doit se refermer au clic à l'extérieur,
// ce que `<details>` seul ne fait pas. Même schéma que `ColorSelect`.
const ENTRIES = [
  { href: "/admin/reglages", label: "Réglages", icon: SlidersHorizontal, hint: "Paramètres, comptes, sécurité" },
  { href: "/admin/listes", label: "Listes déroulantes", icon: ListBullets, hint: "Statuts, types, catégories" },
  { href: "/admin/exports", label: "Exports", icon: DownloadSimple, hint: "Sauvegardes et extractions" },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck, hint: "Journal des actions sensibles" },
];

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Réglages"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
      >
        <GearSix size={18} weight="regular" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface-elevated py-1 shadow-lg"
        >
          {ENTRIES.map(({ href, label, icon: Icon, hint }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-surface"
            >
              <Icon size={16} weight="regular" className="mt-0.5 shrink-0 text-ink-muted" />
              <span className="min-w-0">
                <span className="block text-sm text-ink">{label}</span>
                <span className="block text-xs text-ink-muted">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
