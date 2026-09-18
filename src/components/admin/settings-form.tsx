"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { updateSettings, purgeDeliverablesNow, type PurgeState } from "@/lib/actions/settings";
import { useFormSubmit } from "@/lib/use-form-submit";

interface SettingsDefaults {
  deliverableRetentionAfterEventDays: number;
  deliverableRetentionNoDateDays: number;
  batWatermarkEnabled: boolean;
  popupEnabled: boolean;
  popupMessage: string;
  prospectReminderDefaultDays: number;
  documentSentEmailSubject: string;
  documentSentEmailBody: string;
  paymentReminderEmailSubject: string;
  paymentReminderEmailBody: string;
  invoiceEmailCc: string;
}

export function SettingsForm({ defaultValues }: { defaultValues: SettingsDefaults }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const [purgeState, purgeAction, purgePending] = useActionState<PurgeState, FormData>(
    purgeDeliverablesNow,
    undefined,
  );

  return (
    <div className="flex flex-col gap-10">
      <form action={formAction} onSubmit={formSubmit} className="grid gap-8">
        <section className="grid gap-3">
          <h2 className="text-sm font-medium text-ink">Archivage des livrables</h2>
          <p className="text-xs text-ink-muted">
            Concerne uniquement les livrables finaux des tâches « Terminé ». Les BAT en attente
            de validation ne sont jamais purgés automatiquement.
          </p>
          <div className="flex flex-col gap-2">
            <label htmlFor="deliverableRetentionAfterEventDays" className="text-sm text-ink-muted">
              Purger ce nombre de jours après la date de l&apos;évènement de la tâche
            </label>
            <input
              id="deliverableRetentionAfterEventDays"
              name="deliverableRetentionAfterEventDays"
              type="number"
              min={1}
              required
              defaultValue={defaultValues.deliverableRetentionAfterEventDays}
              className="w-32 rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="deliverableRetentionNoDateDays" className="text-sm text-ink-muted">
              Si la tâche n&apos;a pas de date d&apos;évènement, purger ce nombre de jours après
              l&apos;envoi du livrable
            </label>
            <input
              id="deliverableRetentionNoDateDays"
              name="deliverableRetentionNoDateDays"
              type="number"
              min={1}
              required
              defaultValue={defaultValues.deliverableRetentionNoDateDays}
              className="w-32 rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-medium text-ink">Filigrane des BAT</h2>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              name="batWatermarkEnabled"
              defaultChecked={defaultValues.batWatermarkEnabled}
              className="h-4 w-4 rounded border-line"
            />
            Appliquer automatiquement le filigrane (logo, 10% d&apos;opacité) sur les images
            envoyées en BAT, visibles côté client
          </label>
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-medium text-ink">Message aux clients</h2>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              name="popupEnabled"
              defaultChecked={defaultValues.popupEnabled}
              className="h-4 w-4 rounded border-line"
            />
            Afficher une pop-up à la connexion sur tous les espaces clients
          </label>
          <textarea
            name="popupMessage"
            rows={3}
            defaultValue={defaultValues.popupMessage}
            placeholder="Ex. : Nouvelle fonctionnalité disponible dans l'onglet Livrables !"
            className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-medium text-ink">Emails de facturation</h2>
          <p className="text-xs text-ink-muted">
            Sujet et corps des deux emails réels envoyés autour d&apos;un document (bouton
            &laquo; Envoyer le document &raquo; et &laquo; Envoyer une relance &raquo; dans
            Administratif). Laisser un champ vide revient au texte par défaut. Placeholders
            disponibles : <code>{"{fichier}"}</code> (nom du document){" "}
            <code>{"{montant}"}</code> (relance uniquement, déjà formaté).
          </p>

          <div className="flex flex-col gap-2">
            <label htmlFor="invoiceEmailCc" className="text-sm text-ink-muted">
              Toujours mettre en copie (CC)
            </label>
            <input
              id="invoiceEmailCc"
              name="invoiceEmailCc"
              type="email"
              defaultValue={defaultValues.invoiceEmailCc}
              placeholder="Vide = pas de copie"
              className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-line p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Envoi d&apos;un document
            </p>
            <div className="flex flex-col gap-2">
              <label htmlFor="documentSentEmailSubject" className="text-sm text-ink-muted">
                Sujet
              </label>
              <input
                id="documentSentEmailSubject"
                name="documentSentEmailSubject"
                type="text"
                defaultValue={defaultValues.documentSentEmailSubject}
                className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="documentSentEmailBody" className="text-sm text-ink-muted">
                Corps
              </label>
              <textarea
                id="documentSentEmailBody"
                name="documentSentEmailBody"
                rows={5}
                defaultValue={defaultValues.documentSentEmailBody}
                className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-line p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Relance de paiement
            </p>
            <div className="flex flex-col gap-2">
              <label htmlFor="paymentReminderEmailSubject" className="text-sm text-ink-muted">
                Sujet
              </label>
              <input
                id="paymentReminderEmailSubject"
                name="paymentReminderEmailSubject"
                type="text"
                defaultValue={defaultValues.paymentReminderEmailSubject}
                className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="paymentReminderEmailBody" className="text-sm text-ink-muted">
                Corps
              </label>
              <textarea
                id="paymentReminderEmailBody"
                name="paymentReminderEmailBody"
                rows={3}
                defaultValue={defaultValues.paymentReminderEmailBody}
                className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-medium text-ink">Prospection</h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="prospectReminderDefaultDays" className="text-sm text-ink-muted">
              Délai suggéré (en jours) pour la date de relance d&apos;un nouveau prospect
            </label>
            <input
              id="prospectReminderDefaultDays"
              name="prospectReminderDefaultDays"
              type="number"
              min={1}
              required
              defaultValue={defaultValues.prospectReminderDefaultDays}
              className="w-32 rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <p className="text-xs text-ink-muted">
            Utilisé uniquement pour préremplir la date de relance suggérée à la création d&apos;un
            prospect — reste modifiable ou effaçable au cas par cas.
          </p>
        </section>

        {state?.error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="flex items-center gap-2 text-sm text-accent">
            <CheckCircle size={16} weight="fill" />
            Réglages enregistrés.
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>

      <section className="border-t border-line pt-8">
        <h2 className="text-sm font-medium text-ink">Purge manuelle</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Déclenche immédiatement la purge, sans attendre la tâche planifiée quotidienne.
        </p>
        <form action={purgeAction} className="mt-4">
          <button
            type="submit"
            disabled={purgePending}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent disabled:opacity-60"
          >
            {purgePending ? "Purge en cours..." : "Purger maintenant"}
          </button>
        </form>
        {purgeState?.message && <p className="mt-3 text-sm text-ink-muted">{purgeState.message}</p>}
      </section>
    </div>
  );
}
