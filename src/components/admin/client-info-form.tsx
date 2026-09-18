"use client";

import { useActionState } from "react";
import { ArrowSquareOut, Check, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { ClientAvatar } from "@/components/admin/client-avatar";
import type { ClientFormState } from "@/lib/validation/client";
import { useFormSubmit } from "@/lib/use-form-submit";

const FIELD =
  "rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-sm font-medium text-ink";

// Fusionne l'ancien bandeau collant (juste avatar + nom + bouton) et
// `ClientForm` en un seul composant client, tous deux réunis autour d'un
// unique `useActionState` — c'est la seule façon d'obtenir un `pending`/
// `success` réels pour un bouton qui vit hors de son `<form>` en JSX (relié
// uniquement par l'attribut HTML `form=`, qui fait fonctionner la
// soumission mais que `useFormStatus` ne voit pas : ce hook ne suit que le
// `<form>` ancêtre réel dans l'arbre React, pas une simple association
// DOM). Avant le 2026-07-31, `FormSubmitButton` ne pouvait donc rendre ni
// "Enregistrement..." ni une confirmation après coup — appuyer sur
// "Enregistrer" ne donnait aucune information.
//
// `ClientForm` (composant séparé) reste utilisé tel quel sur la page de
// création, où le bouton est en bas du formulaire et n'a pas ce problème.
export function ClientInfoForm({
  action,
  clientId,
  clientName,
  hasAvatar,
  archivedBanner,
  prospectBanner,
  avatarForm,
  defaultValues,
  categoryOptions,
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  clientId: string;
  clientName: string;
  hasAvatar: boolean;
  archivedBanner: React.ReactNode;
  prospectBanner: React.ReactNode;
  avatarForm: React.ReactNode;
  defaultValues: {
    name: string;
    raisonSociale: string | null;
    notes: string | null;
    address: string | null;
    siret: string | null;
    vatNumber: string | null;
    billingEmail: string | null;
    driveUrl: string | null;
    categoryId: string | null;
    requirePaymentForDeliverables: boolean;
    requirePaymentBeforeWork: boolean;
  };
  categoryOptions: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const formId = "client-info-form";

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <ClientAvatar clientId={clientId} name={clientName} hasAvatar={hasAvatar} size="md" />
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            {clientName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Le bouton "Emails" qui vivait ici a été retiré le 2026-07-31
              (demande explicite) — l'onglet Emails reste accessible via
              /admin/clients/[id]/emails, juste plus depuis ce bandeau. */}
          {state?.success && !pending && (
            <span className="flex items-center gap-1 text-sm text-ink-muted">
              <Check size={14} weight="bold" />
              Enregistré
            </span>
          )}
          <button
            type="submit"
            form={formId}
            disabled={pending}
            className="inline-flex items-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>

      {archivedBanner}
      {prospectBanner}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink-muted">Informations</h2>
        <div className="mt-4">{avatarForm}</div>
        <div className="mt-8">
          <form id={formId} action={formAction} onSubmit={formSubmit} className="grid gap-8 lg:grid-cols-2">
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
                  defaultValue={defaultValues.name}
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
                  defaultValue={defaultValues.raisonSociale ?? ""}
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
                  defaultValue={defaultValues.categoryId ?? ""}
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
                  defaultValue={defaultValues.notes ?? ""}
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
                  defaultValue={defaultValues.address ?? ""}
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
                    defaultValue={defaultValues.siret ?? ""}
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
                    defaultValue={defaultValues.vatNumber ?? ""}
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
                  defaultValue={defaultValues.billingEmail ?? ""}
                  className={FIELD}
                  placeholder="facturation@client.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  {/* Renommé "Lien Google Drive" -> "Lien Drive" le
                      2026-07-31 : le champ accepte n'importe quel service
                      (Drive, mais aussi Dropbox, WeTransfer...), le nom
                      d'origine était trompeur. */}
                  <label htmlFor="driveUrl" className={LABEL}>
                    Lien Drive
                  </label>
                  {defaultValues.driveUrl && (
                    <a
                      href={defaultValues.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
                    >
                      Ouvrir
                      <ArrowSquareOut size={12} weight="regular" />
                    </a>
                  )}
                </div>
                <input
                  id="driveUrl"
                  name="driveUrl"
                  type="url"
                  defaultValue={defaultValues.driveUrl ?? ""}
                  className={FIELD}
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-elevated p-4">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="requirePaymentBeforeWork"
                    defaultChecked={defaultValues.requirePaymentBeforeWork}
                    className="h-4 w-4 rounded border-line"
                  />
                  Paiement requis avant de commencer le travail
                </label>
                <p className="text-xs text-ink-muted">
                  Réglage par défaut pour tous les évènements de ce client — bloque le changement de
                  statut d&apos;un évènement hors de &quot;Nouveau&quot; tant que le paiement
                  n&apos;est pas confirmé. Modifiable ponctuellement évènement par évènement depuis sa
                  fiche.
                </p>

                <label className="mt-2 flex items-center gap-2 border-t border-line pt-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="requirePaymentForDeliverables"
                    defaultChecked={defaultValues.requirePaymentForDeliverables}
                    className="h-4 w-4 rounded border-line"
                  />
                  Paiement requis avant l&apos;accès aux livrables finaux
                </label>
                <p className="text-xs text-ink-muted">
                  Réglage par défaut pour tous les évènements de ce client — verrouille l&apos;accès
                  aux livrables finaux (pas les BAT) tant que le paiement n&apos;est pas confirmé.
                  Modifiable ponctuellement évènement par évènement depuis sa fiche.
                </p>
              </div>
            </div>

            {state?.error && (
              <div className="flex items-center gap-2 text-sm text-danger lg:col-span-2">
                <WarningCircle size={18} weight="fill" />
                {state.error}
              </div>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
