"use client";

import { useTransition } from "react";
import { createPaypalCheckout } from "@/lib/actions/payments";

// Miroir de `PayButton` (Stripe) — deuxième moyen de paiement en ligne,
// affiché à côté plutôt qu'à la place.
export function PaypalButton({ documentId }: { documentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => createPaypalCheckout(documentId))}
      className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
    >
      {isPending ? "Redirection..." : "Payer avec PayPal"}
    </button>
  );
}
