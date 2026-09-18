"use client";

import { useActionState, useState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS } from "@/lib/social-posts";
import type { SocialPostFormState, SocialPostFormValues } from "@/lib/validation/social-post";
import { useFormSubmit } from "@/lib/use-form-submit";

const INPUT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-sm font-medium text-ink";

// Limite de légende la plus stricte parmi les réseaux gérés (Instagram,
// 2 200 caractères) — affichée comme repère, pas bloquante : LinkedIn et
// Facebook acceptent davantage, c'est à l'admin de juger selon la cible.
const CAPTION_SOFT_LIMIT = 2200;

export function SocialPostForm({
  action,
  clients,
  defaultValues,
  submitLabel,
}: {
  action: (state: SocialPostFormState, formData: FormData) => Promise<SocialPostFormState>;
  /** Sélecteur de client, à la création uniquement. */
  clients?: { id: string; name: string }[];
  /** `scheduledAt` : valeur `datetime-local` déjà convertie en heure de Paris. */
  defaultValues?: SocialPostFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // Évite que React 19 vide le formulaire après une erreur — voir
  // src/lib/use-form-submit.ts (défaut constaté en testant ce formulaire).
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const [captionLength, setCaptionLength] = useState(defaultValues?.caption.length ?? 0);

  return (
    <form action={formAction} onSubmit={formSubmit} className="grid gap-5">
      {clients && (
        <div className="flex flex-col gap-2">
          <label htmlFor="clientId" className={LABEL}>
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={defaultValues?.clientId ?? ""}
            className={INPUT}
          >
            <option value="" disabled>
              Choisir un client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={LABEL}>
          Titre
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={160}
          defaultValue={defaultValues?.title ?? ""}
          placeholder="Ex. Soirée techno du 21/09"
          className={INPUT}
        />
        <p className="text-xs text-ink-muted">Repère interne, visible aussi par le client.</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL} mb-2`}>Réseaux</legend>
        <div className="flex flex-wrap gap-2">
          {SOCIAL_NETWORKS.map((network) => (
            <label
              key={network.slug}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink"
            >
              <input
                type="checkbox"
                name="networks"
                value={network.slug}
                defaultChecked={defaultValues?.networks.includes(network.slug)}
                className="sr-only"
              />
              {network.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="format" className={LABEL}>
            Format
          </label>
          <select
            id="format"
            name="format"
            required
            defaultValue={defaultValues?.format || "post"}
            className={INPUT}
          >
            {SOCIAL_FORMATS.map((format) => (
              <option key={format.slug} value={format.slug}>
                {format.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="scheduledAt" className={LABEL}>
            Publication prévue
          </label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={defaultValues?.scheduledAt ?? ""}
            className={INPUT}
          />
          <p className="text-xs text-ink-muted">Heure de Paris. Laissez vide si pas encore planifiée.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="caption" className={LABEL}>
          Texte de la publication
        </label>
        <textarea
          id="caption"
          name="caption"
          rows={7}
          defaultValue={defaultValues?.caption ?? ""}
          onChange={(event) => setCaptionLength(event.target.value.length)}
          placeholder="Légende telle qu'elle sera publiée"
          className={`${INPUT} resize-y`}
        />
        <p className={`text-xs ${captionLength > CAPTION_SOFT_LIMIT ? "text-danger" : "text-ink-muted"}`}>
          {captionLength} / {CAPTION_SOFT_LIMIT} caractères (limite Instagram)
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="hashtags" className={LABEL}>
          Hashtags
        </label>
        <textarea
          id="hashtags"
          name="hashtags"
          rows={2}
          defaultValue={defaultValues?.hashtags ?? ""}
          placeholder="#techno #lyon #soiree"
          className={`${INPUT} resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
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
