"use client";

import { useState, useTransition } from "react";
import { updateProspectReminderDate } from "@/lib/actions/prospects";

// Champ "Relance" de la vue tableur — miroir exact de PaymentRecordDateField
// (Finances) : contrôlé, enregistre au `onChange` (un `<input type="date">`
// n'a pas besoin d'attendre le blur, contrairement au texte libre).
export function ProspectReminderField({ prospectId, date }: { prospectId: string; date: string }) {
  const [value, setValue] = useState(date);
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="date"
      value={value}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        startTransition(() => {
          updateProspectReminderDate(prospectId, next);
        });
      }}
      className="w-full min-w-0 rounded-lg border border-line bg-surface-elevated px-1.5 py-1 text-[11px] text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
    />
  );
}
