"use client";

import { useActionState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { ClientFormState } from "@/lib/validation/client";

const FIELD =
  "rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-sm font-medium text-ink";

// Le bouton d'enregistrement peut vivre **hors** de ce composant (en haut à
// droite de la fiche client, demande du 2026-07-30) : il suffit de lui donner
// `form={formId}`, l'attribut HTML natif qui rattache un bouton à un
// formulaire distant. Pas de state partagé ni de contexte à câbler.
//
// `submitLabel` reste supporté pour la page de création, où le bouton est en
// bas du formulaire comme avant.
export function ClientForm({
  action,
  defaultValues,
  categoryOptions,
  submitLabel,
  formId,
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  defaultValues?: {
    name: string;
    raisonSociale?: string | null;
    notes: string | null;
    address: string | null;
    siret: string | null;
    vatNumber: string | null;
    billingEmail: string | null;
    driveUrl: string | null;
    categoryId: string | null;
  };
  categoryOptions: { id: string; label: string }[];
  /** Si absent, aucun bouton n'est rendu : l'appelant en place un ailleurs
   * avec `form={formId}`. */
  submitLabel?: string;
  formId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form id={formId} action={formAction} className="grid gap-8 lg:grid-cols-2">
      {/* Colonne gauche : identité du client. */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className={LABEL}>
            Nom du client
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={defaultValues?.name}
            className={FIELD}
            placeholder="Nom de l'entreprise ou de la personne"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="raisonSociale" className={LABEL}>
            Raison sociale <span className="text-ink-muted">(facultatif)</span>
          </label>
          <input
            id="raisonSociale"
            name="raisonSociale"
            type="text"
            defaultValue={defaultValues?.raisonSociale ?? ""}
            className={FIELD}
            placeholder="Nom légal de l'entité, si différent du nom ci-dessus"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="categoryId" className={LABEL}>
            Catégorie <span className="text-ink-muted">(facultatif)</span>
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={defaultValues?.categoryId ?? ""}
            className={FIELD}
          >
            <option value="">Non catégorisé</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-muted">
            Les catégories se gèrent depuis Listes → Catégories de client.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="notes" className={LABEL}>
            Notes internes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={6}
            defaultValue={defaultValues?.notes ?? ""}
            className={`resize-none ${FIELD}`}
            placeholder="Contact, préférences, historique..."
          />
        </div>
      </div>

      {/* Colonne droite : tout ce qui sert à facturer et à échanger des
          documents — regroupé pour ne pas noyer l'identité du client. */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="address" className={LABEL}>
            Adresse
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            defaultValue={defaultValues?.address ?? ""}
            className={`resize-none ${FIELD}`}
            placeholder="Numéro, rue, code postal, ville"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="siret" className={LABEL}>
              SIRET
            </label>
            <input
              id="siret"
              name="siret"
              type="text"
              defaultValue={defaultValues?.siret ?? ""}
              className={FIELD}
              placeholder="14 chiffres"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="vatNumber" className={LABEL}>
              N° TVA intracommunautaire
            </label>
            <input
              id="vatNumber"
              name="vatNumber"
              type="text"
              defaultValue={defaultValues?.vatNumber ?? ""}
              className={FIELD}
              placeholder="FR12345678900"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="billingEmail" className={LABEL}>
            Email de facturation
          </label>
          <input
            id="billingEmail"
            name="billingEmail"
            type="email"
            defaultValue={defaultValues?.billingEmail ?? ""}
            className={FIELD}
            placeholder="facturation@client.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="driveUrl" className={LABEL}>
            Lien Drive
          </label>
          <input
            id="driveUrl"
            name="driveUrl"
            type="url"
            defaultValue={defaultValues?.driveUrl ?? ""}
            className={FIELD}
            placeholder="https://drive.google.com/..."
          />
        </div>
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger lg:col-span-2">
          <WarningCircle size={18} weight="fill" />
          {state.error}
        </div>
      )}

      {submitLabel && (
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Enregistrement..." : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
