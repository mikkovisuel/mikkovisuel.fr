"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { createAdmin, revokeAdmin } from "@/lib/actions/admin-accounts";
import { StepUpButton } from "@/components/admin/step-up-button";
import { useFormSubmit } from "@/lib/use-form-submit";

type AdminAccount = {
  id: string;
  email: string;
  lastLoginAt: Date | null;
};

const LOGIN_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function AdminAccountsPanel({
  admins,
  currentAdminId,
}: {
  admins: AdminAccount[];
  currentAdminId: string;
}) {
  const [state, formAction, pending] = useActionState(createAdmin, undefined);
  const { formRef, onSubmit: formSubmit } = useFormSubmit(formAction, {
    pending,
    state,
    resetOnSuccess: true,
  });

  return (
    <div>
      <div className="divide-y divide-line rounded-2xl border border-line">
        {admins.map((admin) => (
          <div key={admin.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm text-ink">
                {admin.email}
                {admin.id === currentAdminId && <span className="text-ink-muted"> (vous)</span>}
              </p>
              <p className="text-xs text-ink-muted">
                {admin.lastLoginAt
                  ? `Dernière connexion : ${LOGIN_FORMATTER.format(admin.lastLoginAt)}`
                  : "Jamais connecté"}
              </p>
            </div>
            {admin.id !== currentAdminId && (
              <StepUpButton
                action={(state, formData) => revokeAdmin(admin.id, state, formData)}
                label="Révoquer"
                confirmMessage={`Révoquer l'accès de ${admin.email} ? Cette action est immédiate et définitive.`}
                submitLabel="Révoquer"
                danger
              />
            )}
          </div>
        ))}
      </div>

      <form action={formAction} onSubmit={formSubmit} ref={formRef} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-1 min-w-[220px] flex-col gap-2">
          <label htmlFor="invite-admin-email" className="text-sm font-medium text-ink">
            Ajouter un administrateur
          </label>
          <input
            id="invite-admin-email"
            name="email"
            type="email"
            required
            placeholder="email@exemple.com"
            className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "..." : "Inviter"}
        </button>
      </form>
      {state?.error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <WarningCircle size={14} weight="fill" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <CheckCircle size={14} weight="fill" className="text-accent" />
          Invitation envoyée.
        </div>
      )}
    </div>
  );
}
