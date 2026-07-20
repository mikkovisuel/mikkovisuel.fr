"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ClientFormState } from "@/lib/validation/client";

export function ClientForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  defaultValues?: {
    name: string;
    notes: string | null;
    address: string | null;
    siret: string | null;
    vatNumber: string | null;
    billingEmail: string | null;
    driveUrl: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid max-w-lg gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Nom du client
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name}
          className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Nom de l'entreprise ou de la personne"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="address" className="text-sm font-medium text-ink">
          Adresse
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={defaultValues?.address ?? ""}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Numéro, rue, code postal, ville"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="siret" className="text-sm font-medium text-ink">
            SIRET
          </label>
          <input
            id="siret"
            name="siret"
            type="text"
            defaultValue={defaultValues?.siret ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="14 chiffres"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="vatNumber" className="text-sm font-medium text-ink">
            N° TVA intracommunautaire
          </label>
          <input
            id="vatNumber"
            name="vatNumber"
            type="text"
            defaultValue={defaultValues?.vatNumber ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="FR12345678900"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="billingEmail" className="text-sm font-medium text-ink">
            Email de facturation
          </label>
          <input
            id="billingEmail"
            name="billingEmail"
            type="email"
            defaultValue={defaultValues?.billingEmail ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="facturation@client.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="driveUrl" className="text-sm font-medium text-ink">
            Lien Google Drive
          </label>
          <input
            id="driveUrl"
            name="driveUrl"
            type="url"
            defaultValue={defaultValues?.driveUrl ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="https://drive.google.com/..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-sm font-medium text-ink">
          Notes internes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues?.notes ?? ""}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Contact, préférences, historique..."
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
          {pending ? "Enregistrement..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
