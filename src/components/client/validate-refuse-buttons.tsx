"use client";

import { useActionState, useState, useTransition } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { validateTask, refuseTask } from "@/lib/actions/tasks";

export function ValidateRefuseButtons({
  taskId,
  readOnly = false,
}: {
  taskId: string;
  readOnly?: boolean;
}) {
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [isValidating, startValidateTransition] = useTransition();
  const [state, formAction, refusePending] = useActionState(
    refuseTask.bind(null, taskId),
    undefined,
  );

  if (readOnly) {
    return <p className="text-sm text-ink-muted">Validation désactivée dans l&apos;espace de démonstration.</p>;
  }

  if (showRefuseForm) {
    return (
      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <textarea
          name="reason"
          required
          rows={2}
          placeholder="Motif du refus (obligatoire)"
          className="resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
        onClick={() => startValidateTransition(() => validateTask(taskId))}
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
