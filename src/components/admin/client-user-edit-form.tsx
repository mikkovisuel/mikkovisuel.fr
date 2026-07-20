"use client";

import { useActionState, useId } from "react";
import { Check, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ClientUserEditFormState } from "@/lib/validation/client";

export function ClientUserEditForm({
  action,
  defaultValues,
}: {
  action: (state: ClientUserEditFormState, formData: FormData) => Promise<ClientUserEditFormState>;
  defaultValues: { phone: string | null; role: string | null };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const phoneId = useId();
  const roleId = useId();

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={phoneId} className="text-xs font-medium text-ink-muted">
          Téléphone
        </label>
        <input
          id={phoneId}
          name="phone"
          type="tel"
          defaultValue={defaultValues.phone ?? ""}
          className="rounded-lg border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="06 12 34 56 78"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={roleId} className="text-xs font-medium text-ink-muted">
          Rôle
        </label>
        <input
          id={roleId}
          name="role"
          type="text"
          defaultValue={defaultValues.role ?? ""}
          className="rounded-lg border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
