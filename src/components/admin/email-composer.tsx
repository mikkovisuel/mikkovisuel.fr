"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { GmailMessageFormState } from "@/lib/validation/gmail-message";

export function EmailComposer({
  action,
  toDisplay,
  toDefaultValue,
  subjectDisplay,
  submitLabel,
  placeholder,
}: {
  action: (state: GmailMessageFormState, formData: FormData) => Promise<GmailMessageFormState>;
  /** Destinataire figé (réponse) — affiché en lecture seule plutôt qu'un champ. */
  toDisplay?: string;
  /** Destinataire pré-rempli mais modifiable (transfert/nouveau message). */
  toDefaultValue?: string;
  /** Objet figé (réponse/transfert) — affiché en lecture seule. */
  subjectDisplay?: string;
  submitLabel: string;
  placeholder?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {toDisplay ? (
        <p className="text-sm text-ink-muted">
          À : <span className="text-ink">{toDisplay}</span>
        </p>
      ) : (
        <input
          name="to"
          type="email"
          required
          defaultValue={toDefaultValue}
          placeholder="destinataire@exemple.com"
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      )}

      {subjectDisplay ? (
        <p className="text-sm text-ink-muted">
          Objet : <span className="text-ink">{subjectDisplay}</span>
        </p>
      ) : (
        <input
          name="subject"
          required
          placeholder="Objet"
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      )}

      <textarea
        name="body"
        required
        rows={6}
        placeholder={placeholder ?? "Écrire un message..."}
        className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 text-sm text-accent">
          <CheckCircle size={16} weight="fill" />
          Message envoyé.
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Envoi..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
