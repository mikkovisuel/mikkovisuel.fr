"use client";

import { useActionState, useState, useTransition } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { validateTaskByAdmin, refuseTaskByAdmin } from "@/lib/actions/tasks";
import { useFormSubmit } from "@/lib/use-form-submit";

// Miroir de `ValidateRefuseButtons` (espace client), pour valider/refuser un
// BAT directement depuis l'admin — utile quand le client donne son accord
// par téléphone/WhatsApp plutôt que depuis son espace. Le client reçoit la
// même notification email que s'il avait validé/refusé lui-même (voir
// `validateTaskByAdmin`/`refuseTaskByAdmin`).
export function TaskValidateRefuseButtons({ taskId }: { taskId: string }) {
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [isValidating, startValidateTransition] = useTransition();
  const [state, formAction, refusePending] = useActionState(
    refuseTaskByAdmin.bind(null, taskId),
    undefined,
  );
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending: refusePending, state });

  if (showRefuseForm) {
    return (
      <form action={formAction} onSubmit={formSubmit} className="mt-3 flex w-full flex-col gap-2">
        <textarea
          name="reason"
          required
          rows={2}
          placeholder="Motif du refus (obligatoire)"
          className="resize-none rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {state?.error && (
          <span className="flex items-center gap-1 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </span>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={refusePending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {refusePending ? "Envoi..." : "Confirmer le refus"}
          </button>
          <button
            type="button"
            onClick={() => setShowRefuseForm(false)}
            className="rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={isValidating}
        onClick={() => startValidateTransition(() => validateTaskByAdmin(taskId))}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {isValidating ? "..." : "Valider"}
      </button>
      <button
        type="button"
        onClick={() => setShowRefuseForm(true)}
        className="rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        Refuser
      </button>
    </div>
  );
}
