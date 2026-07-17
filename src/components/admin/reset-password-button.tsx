"use client";

import { useState, useTransition } from "react";
import { adminResetClientPassword } from "@/lib/actions/password-reset";

export function ResetPasswordButton({ clientUserId }: { clientUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  if (sent) {
    return <span className="text-xs text-ink-muted">Email envoyé</span>;
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await adminResetClientPassword(clientUserId);
          setSent(true);
        });
      }}
      className="text-xs text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
    >
      {isPending ? "Envoi..." : "Réinitialiser le mot de passe"}
    </button>
  );
}
