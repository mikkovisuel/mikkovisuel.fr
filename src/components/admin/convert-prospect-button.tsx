"use client";

import { useTransition } from "react";
import { convertProspectToClient } from "@/lib/actions/prospects";

export function ConvertProspectButton({ prospectId }: { prospectId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          !window.confirm(
            "Convertir ce prospect en client ? Un espace client sera créé (avec un compte de connexion si un email est renseigné).",
          )
        ) {
          return;
        }
        startTransition(() => {
          convertProspectToClient(prospectId);
        });
      }}
      className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      {isPending ? "Conversion..." : "Convertir en client"}
    </button>
  );
}
