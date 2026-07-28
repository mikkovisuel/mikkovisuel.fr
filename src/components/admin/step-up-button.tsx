"use client";

import { useActionState, useState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { StepUpFormState } from "@/lib/step-up-auth";

// Bouton pour une action admin sensible (suppression définitive,
// réinitialisation du mot de passe d'un client, usurpation d'espace
// client) : au clic, révèle un petit formulaire demandant le mot de passe
// admin plutôt qu'un simple `window.confirm` — voir requireFreshAdminPassword.
export function StepUpButton({
  action,
  label,
  confirmMessage,
  submitLabel = "Confirmer",
  successMessage,
  triggerClassName = "text-sm text-ink-muted transition-colors hover:text-ink",
  danger = false,
}: {
  action: (state: StepUpFormState, formData: FormData) => Promise<StepUpFormState>;
  label: string;
  confirmMessage: string;
  submitLabel?: string;
  /** Si renseigné, l'action ne redirige pas : affiche ce message à la place du formulaire une fois réussie. */
  successMessage?: string;
  triggerClassName?: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, undefined);

  if (successMessage && state?.success) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
        <CheckCircle size={14} weight="fill" className="text-accent" />
        {successMessage}
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {label}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-line bg-surface-elevated p-3"
    >
      <p className="text-xs text-ink-muted">{confirmMessage}</p>
      <input
        type="password"
        name="stepUpPassword"
        required
        autoFocus
        placeholder="Votre mot de passe admin"
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      {state?.error && (
        <div className="flex items-center gap-1.5 text-xs text-danger">
          <WarningCircle size={14} weight="fill" />
          {state.error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-transform active:scale-[0.98] disabled:opacity-60 ${
            danger
              ? "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
              : "border-transparent bg-accent text-accent-ink"
          }`}
        >
          {pending ? "..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-ink-muted transition-colors hover:text-ink"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
