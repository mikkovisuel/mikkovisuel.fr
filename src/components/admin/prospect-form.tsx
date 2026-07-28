"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ProspectFormState } from "@/lib/validation/prospect";

export function ProspectForm({
  action,
  statusOptions,
  defaultValues,
  submitLabel,
}: {
  action: (state: ProspectFormState, formData: FormData) => Promise<ProspectFormState>;
  statusOptions: { slug: string; label: string }[];
  defaultValues?: {
    name: string;
    company: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    instagram: string | null;
    notes: string | null;
    statusSlug: string;
    nextReminderAt: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid max-w-lg gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Nom
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={defaultValues?.name}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="Nom du contact"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="company" className="text-sm font-medium text-ink">
            Entreprise / activité
          </label>
          <input
            id="company"
            name="company"
            type="text"
            defaultValue={defaultValues?.company ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="Ex. Studio Untel"
          />
        </div>
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
          <label htmlFor="phone" className="text-sm font-medium text-ink">
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            defaultValue={defaultValues?.phone ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="06 12 34 56 78"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="contact@exemple.com"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="instagram" className="text-sm font-medium text-ink">
            Instagram
          </label>
          <input
            id="instagram"
            name="instagram"
            type="text"
            defaultValue={defaultValues?.instagram ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="@compte"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="statusSlug" className="text-sm font-medium text-ink">
            Statut
          </label>
          <select
            id="statusSlug"
            name="statusSlug"
            defaultValue={defaultValues?.statusSlug ?? statusOptions[0]?.slug}
            className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {statusOptions.map((status) => (
              <option key={status.slug} value={status.slug}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="nextReminderAt" className="text-sm font-medium text-ink">
          Date de relance
        </label>
        <input
          id="nextReminderAt"
          name="nextReminderAt"
          type="date"
          defaultValue={defaultValues?.nextReminderAt ?? ""}
          className="w-48 rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <p className="text-xs text-ink-muted">
          Une alerte vous sera envoyée par email à cette date (réglable dans Réglages). Laissez vide
          pour ne pas planifier de relance.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-sm font-medium text-ink">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues?.notes ?? ""}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Contexte, échanges précédents..."
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
