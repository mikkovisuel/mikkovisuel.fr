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
}: {
  prospectId: string;
  field: ProspectTextField;
  defaultValue: string;
  type?: "text" | "email" | "tel";
  placeholder?: string;
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
      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-ink transition-colors placeholder:text-ink-muted/60 hover:border-line focus:border-accent focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
    />
  );
}
