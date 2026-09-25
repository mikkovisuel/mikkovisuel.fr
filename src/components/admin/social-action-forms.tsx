"use client";

import { useActionState, useEffect, useTransition } from "react";
import { WarningCircle, CheckCircle, Check } from "@phosphor-icons/react/dist/ssr";
import { useFormSubmit } from "@/lib/use-form-submit";
import { toggleSocialAction } from "@/lib/actions/social-actions";
import type { SocialActionFormState } from "@/lib/validation/social-actions";

// Formulaires et case à cocher des actions (2026-09-25). Une action se crée
// et se coche en un geste : c'est tout l'intérêt de l'objet.

type Action = (state: SocialActionFormState, formData: FormData) => Promise<SocialActionFormState>;

const INPUT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-xs text-ink-muted";
const SUBMIT =
  "rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60";

export function SocialActionForm({
  action,
  clients,
  defaultValues,
  submitLabel = "Créer l'action",
  resetOnSuccess = true,
  onSuccess,
}: {
  action: Action;
  clients: { id: string; name: string }[];
  defaultValues?: { title?: string; description?: string; clientId?: string; dueAt?: string };
  submitLabel?: string;
  resetOnSuccess?: boolean;
  /** Appelé après un enregistrement réussi — sert à refermer la modale. */
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess });

  useEffect(() => {
    if (!pending && state?.saved) onSuccess?.();
  }, [pending, state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <input
        name="title"
        required
        maxLength={160}
        defaultValue={defaultValues?.title ?? ""}
        placeholder="Ex. Répondre aux commentaires de la semaine"
        aria-label="Titre de l'action"
        className={INPUT}
      />
      <div className="flex flex-wrap gap-3">
        <label className={`grid gap-1 ${LABEL}`}>
          Quand (Paris)
          <input
            name="dueAt"
            type="datetime-local"
            required
            defaultValue={defaultValues?.dueAt ?? ""}
            className={INPUT}
          />
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Client (facultatif)
          <select name="clientId" defaultValue={defaultValues?.clientId ?? ""} className={INPUT}>
            <option value="">Aucun — action interne</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        name="description"
        rows={2}
        defaultValue={defaultValues?.description ?? ""}
        placeholder="Description (facultatif)"
        className={`${INPUT} resize-y`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Enregistrement..." : submitLabel}
        </button>
        {state?.error && (
          <span className="flex items-center gap-1 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </span>
        )}
        {state?.saved && !pending && (
          <span className="flex items-center gap-1 text-sm text-ink-muted">
            <CheckCircle size={16} weight="fill" className="text-accent" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  );
}

/** Case à cocher d'une action : un clic, sans confirmation. */
export function SocialActionCheckbox({ actionId, done, label }: { actionId: string; done: boolean; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={done}
      aria-label={done ? `Décocher ${label}` : `Cocher ${label}`}
      onClick={() => startTransition(() => toggleSocialAction(actionId))}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        done ? "border-accent bg-accent text-accent-ink" : "border-line text-transparent hover:border-accent"
      } ${pending ? "opacity-60" : ""}`}
    >
      <Check size={12} weight="bold" />
    </button>
  );
}
