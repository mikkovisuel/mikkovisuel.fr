"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/lib/actions/payments";

export function PayButton({ documentId }: { documentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => createCheckoutSession(documentId))}
      className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      {isPending ? "Redirection..." : "Payer"}
    </button>
  );
}
