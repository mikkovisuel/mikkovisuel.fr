"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { changeClientPassword } from "@/lib/actions/password-reset";
import { useFormSubmit } from "@/lib/use-form-submit";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeClientPassword, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  // Ajuste l'affichage du pop-up pendant le rendu plutôt que dans un effet
  // (même pattern que TaskForm) — évite un setState-in-effect superflu.
  const [prevPending, setPrevPending] = useState(pending);
  const [showSuccess, setShowSuccess] = useState(false);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (prevPending && !pending && !state?.error) {
      setShowSuccess(true);
    }
  }

  return (
    <>
      <form ref={formRef} action={formAction} onSubmit={formSubmit} className="grid max-w-sm gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="currentPassword" className="text-sm font-medium text-ink">
            Mot de passe actuel
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="newPassword" className="text-sm font-medium text-ink">
            Nouveau mot de passe
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            autoComplete="new-password"
            className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
            Confirmer le nouveau mot de passe
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {state?.error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <WarningCircle size={18} weight="fill" />
            {state.error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Modification..." : "Modifier le mot de passe"}
          </button>
        </div>
      </form>

      {showSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowSuccess(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-w-sm rounded-2xl border border-line bg-surface-elevated p-6 text-center shadow-xl"
          >
            <p className="text-ink">Votre mot de passe a bien été modifié.</p>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
