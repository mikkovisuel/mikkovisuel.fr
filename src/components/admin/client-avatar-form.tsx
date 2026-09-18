"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { ClientAvatar } from "@/components/admin/client-avatar";
import { removeClientAvatar } from "@/lib/actions/clients";
import type { ClientFormState } from "@/lib/validation/client";
import { useFormSubmit } from "@/lib/use-form-submit";

// Formulaire distinct de celui des informations : un envoi de fichier n'a ni
// les mêmes contraintes ni le même rythme qu'une modification de champs
// texte, et les imbriquer serait de toute façon invalide en HTML (un
// formulaire ne peut pas en contenir un autre).
export function ClientAvatarForm({
  clientId,
  clientName,
  hasAvatar,
  action,
}: {
  clientId: string;
  clientName: string;
  hasAvatar: boolean;
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit: formSubmit } = useFormSubmit(formAction, {
    pending,
    state,
    resetOnSuccess: true,
  });

  return (
    <div className="flex items-center gap-4">
      <ClientAvatar clientId={clientId} name={clientName} hasAvatar={hasAvatar} size="lg" />
      <div className="flex flex-col gap-2">
        <form action={formAction} onSubmit={formSubmit} ref={formRef} className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp"
            required
            className="max-w-[15rem] text-xs text-ink-muted file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-surface-elevated file:px-3 file:py-1.5 file:text-xs file:text-ink hover:file:border-accent"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
          >
            {pending ? "Envoi..." : "Charger"}
          </button>
        </form>
        <div className="flex items-center gap-3">
          <p className="text-xs text-ink-muted">PNG, JPEG ou WebP — 5 Mo maximum.</p>
          {hasAvatar && (
            <form action={removeClientAvatar.bind(null, clientId)}>
              <button type="submit" className="text-xs text-ink-muted transition-colors hover:text-danger">
                Retirer
              </button>
            </form>
          )}
        </div>
        {state?.error && (
          <span className="flex items-center gap-1 text-xs text-danger">
            <WarningCircle size={14} weight="fill" />
            {state.error}
          </span>
        )}
      </div>
    </div>
  );
}
