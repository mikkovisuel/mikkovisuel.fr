"use client";

import { useActionState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { submitInterfaceFeedback } from "@/lib/actions/feedback";
import { useFormSubmit } from "@/lib/use-form-submit";

export function FeedbackForm({ readOnly = false }: { readOnly?: boolean }) {
  const [state, formAction, pending] = useActionState(submitInterfaceFeedback, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });

  if (readOnly) {
    return (
      <p className="text-sm text-ink-muted">
        L&apos;envoi de suggestions est désactivé dans l&apos;espace de démonstration.
      </p>
    );
  }

  if (state?.success) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-elevated p-6">
        <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-accent" />
        <div>
          <p className="font-medium text-ink">Message envoyé.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Merci pour votre retour, il a bien été transmis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={formSubmit} className="flex flex-col gap-4">
      <textarea
        name="message"
        required
        rows={6}
        placeholder="Qu'est-ce qui pourrait être amélioré dans votre expérience sur l'espace client ?"
        className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
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
          {pending ? "Envoi..." : "Envoyer le retour"}
        </button>
      </div>
    </form>
  );
}
