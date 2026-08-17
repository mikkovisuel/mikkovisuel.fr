"use client";

import { useTransition } from "react";
import { updateProspectField, type ProspectTextField } from "@/lib/actions/prospects";

// Cellule éditable en place de la vue tableur Prospection — même principe que
// PaymentRecordDateField (Finances) : pas de bouton "valider", enregistre au
// blur. `key={defaultValue}` force le remontage si la valeur change côté
// serveur (ex. email normalisé en minuscules) pour rester un input non
// contrôlé synchronisé, même trick que `bulkStatusKey` dans TaskTable.
export function ProspectInlineField({
  prospectId,
  field,
  defaultValue,
  type = "text",
  placeholder = "—",
  // Variante resserrée (demande du 2026-08-17, colonne Instagram partagée
  // entre pseudo et lien) : texte plus petit et grisé, pour rester lisible
  // comme un champ secondaire sans reprendre toute la hauteur d'une cellule.
  dense = false,
}: {
  prospectId: string;
  field: ProspectTextField;
  defaultValue: string;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  dense?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <input
      key={defaultValue}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={pending}
      onBlur={(event) => {
        const next = event.target.value.trim();
        if (next === defaultValue.trim()) return;
        startTransition(() => {
          updateProspectField(prospectId, field, next);
        });
      }}
      className={
        dense
          ? "w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[11px] text-ink-muted transition-colors placeholder:text-ink-muted/60 hover:border-line focus:border-accent focus:bg-surface-elevated focus:text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
          : "w-full rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink transition-colors placeholder:text-ink-muted/60 hover:border-line focus:border-accent focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
      }
    />
  );
}
