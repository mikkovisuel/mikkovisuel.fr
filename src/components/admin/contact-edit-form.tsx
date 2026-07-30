"use client";

import { useActionState, useId } from "react";
import { Check, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ContactEditFormState } from "@/lib/validation/client";

// Édition d'un contact déjà créé. Volontairement limitée à l'identité (nom,
// email, téléphone, fonction) : l'accès à l'espace client et le mot de passe
// se pilotent depuis des boutons séparés, pour qu'une correction de numéro ne
// puisse pas fermer un accès par effet de bord.
export function ContactEditForm({
  action,
  defaultValues,
}: {
  action: (state: ContactEditFormState, formData: FormData) => Promise<ContactEditFormState>;
  defaultValues: {
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const roleId = useId();

  const fieldClass =
    "rounded-lg border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={nameId} className="text-xs font-medium text-ink-muted">
          Nom
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          required
          defaultValue={defaultValues.name}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={emailId} className="text-xs font-medium text-ink-muted">
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          defaultValue={defaultValues.email ?? ""}
          className={fieldClass}
          placeholder="contact@client.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={phoneId} className="text-xs font-medium text-ink-muted">
          Téléphone
        </label>
        <input
          id={phoneId}
          name="phone"
          type="tel"
          defaultValue={defaultValues.phone ?? ""}
          className={fieldClass}
          placeholder="06 12 34 56 78"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={roleId} className="text-xs font-medium text-ink-muted">
          Fonction
        </label>
        <input
          id={roleId}
          name="role"
          type="text"
          defaultValue={defaultValues.role ?? ""}
          className={fieldClass}
          placeholder="Directeur, DJ, photographe..."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>

      {state?.success && (
        <span className="flex items-center gap-1 text-xs text-ink-muted">
          <Check size={14} weight="bold" />
          Enregistré
        </span>
      )}
      {state?.error && (
        <span className="flex items-center gap-1 text-xs text-danger">
          <WarningCircle size={14} weight="fill" />
          {state.error}
        </span>
      )}
    </form>
  );
}
