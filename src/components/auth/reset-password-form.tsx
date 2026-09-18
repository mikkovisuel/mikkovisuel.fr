"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ResetPasswordState } from "@/lib/actions/password-reset";
import { useFormSubmit } from "@/lib/use-form-submit";

export function ResetPasswordForm({
  action,
}: {
  action: (state: ResetPasswordState, formData: FormData) => Promise<ResetPasswordState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });

  return (
    <form action={formAction} onSubmit={formSubmit} className="grid gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="8 caractères minimum"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
          Confirmer le mot de passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Retapez le mot de passe"
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <WarningCircle size={18} weight="fill" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Réinitialiser le mot de passe"}
      </button>
    </form>
  );
}
