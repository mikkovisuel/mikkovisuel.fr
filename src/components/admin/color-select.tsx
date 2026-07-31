"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CaretDown } from "@phosphor-icons/react/dist/ssr";
import {
  PALETTE_COLORS,
  PALETTE_LABELS,
  PALETTE_SWATCH_CLASSES,
  type PaletteColor,
} from "@/lib/dropdown-lists";

// Remplace l'ancienne liste déroulante native, qui affichait les
// identifiants bruts en anglais ("slate", "emerald"...) sans le moindre
// aperçu : à 8 couleurs c'était déjà peu lisible, à 24 ce serait
// inutilisable.
//
// La valeur part dans le formulaire via un `<input type="hidden">` : les
// deux formulaires appelants sont des Server Actions qui lisent
// `formData.get("color")`, le contrat côté serveur est donc inchangé.
export function ColorSelect({ name, defaultValue }: { name: string; defaultValue: string }) {
  // La valeur en base peut être une couleur retirée d'une future palette :
  // on retombe sur "slate" plutôt que d'afficher une pastille vide.
  const initial = (PALETTE_COLORS as readonly string[]).includes(defaultValue)
    ? (defaultValue as PaletteColor)
    : "slate";

  const [selected, setSelected] = useState<PaletteColor>(initial);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic à l'extérieur. `setState` est appelé depuis le
  // gestionnaire d'évènement, pas dans le corps de l'effet — la règle
  // `react-hooks/set-state-in-effect` du projet vise le second cas.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <span
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 rounded-full ${PALETTE_SWATCH_CLASSES[selected]}`}
        />
        {PALETTE_LABELS[selected]}
        <CaretDown size={12} weight="bold" className="text-ink-muted" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Couleur"
          className="absolute left-0 z-30 mt-2 w-64 rounded-2xl border border-line bg-surface-elevated p-2 shadow-lg"
        >
          <div className="grid grid-cols-6 gap-1">
            {PALETTE_COLORS.map((color) => {
              const isSelected = color === selected;
              return (
                <button
                  key={color}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  // Le libellé français sert à la fois d'infobulle au survol
                  // et de nom accessible : la pastille seule ne dit rien à
                  // un lecteur d'écran.
                  title={PALETTE_LABELS[color]}
                  aria-label={PALETTE_LABELS[color]}
                  onClick={() => {
                    setSelected(color);
                    setOpen(false);
                  }}
                  className="flex h-9 items-center justify-center rounded-lg transition-colors hover:bg-surface"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${PALETTE_SWATCH_CLASSES[color]} ${
                      isSelected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface-elevated" : ""
                    }`}
                  >
                    {isSelected && <Check size={12} weight="bold" className="text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="px-1 pt-2 text-xs text-ink-muted">{PALETTE_LABELS[selected]}</p>
        </div>
      )}
    </div>
  );
}
