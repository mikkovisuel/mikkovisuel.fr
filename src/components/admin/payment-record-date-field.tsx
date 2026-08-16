"use client";

import { useState, useTransition } from "react";
import { updatePaymentRecordDate } from "@/lib/actions/payment-records";

// Champ date éditable en place (demande du 2026-08-16) — le mois affecté
// aux Finances doit pouvoir être corrigé après coup sans passer par un
// formulaire séparé. Enregistre au `onChange`, pas besoin de bouton
// "valider" pour un unique champ.
export function PaymentRecordDateField({
  recordId,
  date,
}: {
  recordId: string;
  date: string;
}) {
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
          updatePaymentRecordDate(recordId, next);
        });
      }}
      title="Mois affecté aux Finances"
      className="rounded-lg border border-line bg-surface-elevated px-2 py-1 text-xs text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
    />
  );
}
