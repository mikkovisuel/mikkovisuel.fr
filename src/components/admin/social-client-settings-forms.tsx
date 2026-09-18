"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { useFormSubmit } from "@/lib/use-form-submit";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS, WEEKDAY_LABELS } from "@/lib/social-posts";
import type { SocialLibraryFormState } from "@/lib/validation/social-library";

// Formulaires de la page "Réglages réseaux" d'un client
// (/admin/reseaux/clients/[clientId], livraison 2 du module Community
// management). Tous passent par useFormSubmit : une erreur ne vide jamais
// la saisie ; les formulaires d'ajout se vident après un succès.

type Action = (state: SocialLibraryFormState, formData: FormData) => Promise<SocialLibraryFormState>;

const INPUT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-sm font-medium text-ink";
const SUBMIT =
  "rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60";

function Feedback({ state, pending, savedLabel }: { state: SocialLibraryFormState; pending: boolean; savedLabel: string }) {
  if (state?.error) {
    return (
      <span className="flex items-center gap-1 text-sm text-danger">
        <WarningCircle size={16} weight="fill" />
        {state.error}
      </span>
    );
  }
  if (state?.saved && !pending) {
    return (
      <span className="flex items-center gap-1 text-sm text-ink-muted">
        <CheckCircle size={16} weight="fill" className="text-accent" />
        {savedLabel}
      </span>
    );
  }
  return null;
}

export function SocialProfileForm({
  action,
  editorialLine,
  brandTone,
}: {
  action: Action;
  editorialLine: string;
  brandTone: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit } = useFormSubmit(formAction, { pending, state });
  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2">
        <span className={LABEL}>Ligne éditoriale</span>
        <textarea
          name="editorialLine"
          rows={4}
          defaultValue={editorialLine}
          placeholder="Thèmes, piliers de contenu, fréquence, ce qu'on publie et ce qu'on évite..."
          className={`${INPUT} resize-y`}
        />
        <span className="text-xs text-ink-muted">Rappelée en préparant chaque publication de ce client.</span>
      </label>
      <label className="grid gap-2">
        <span className={LABEL}>Ton de la marque</span>
        <textarea
          name="brandTone"
          rows={3}
          defaultValue={brandTone}
          placeholder="Ex. festif et direct, tutoiement, emojis avec modération, jamais de jargon"
          className={`${INPUT} resize-y`}
        />
        <span className="text-xs text-ink-muted">Repris par la rédaction assistée par IA des légendes.</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        <Feedback state={state} pending={pending} savedLabel="Enregistré" />
      </div>
    </form>
  );
}

export function SocialLibraryItemForm({ action, kind }: { action: Action; kind: "hashtags" | "template" }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess: true });
  const isHashtags = kind === "hashtags";
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-2">
      <input
        name="name"
        required
        maxLength={80}
        placeholder={isHashtags ? "Nom du groupe (ex. Soirées techno)" : "Nom du modèle (ex. Annonce de soirée)"}
        className={INPUT}
      />
      <textarea
        name="content"
        required
        rows={isHashtags ? 2 : 4}
        placeholder={isHashtags ? "#techno #lyon #clubbing" : "Texte réutilisable, à compléter à chaque publication"}
        className={`${INPUT} resize-y`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Ajout..." : isHashtags ? "Ajouter le groupe" : "Ajouter le modèle"}
        </button>
        <Feedback state={state} pending={pending} savedLabel="Ajouté" />
      </div>
    </form>
  );
}

export function RecurringSlotForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess: true });
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <input
        name="title"
        required
        maxLength={160}
        placeholder="Ex. Flyer de la soirée du samedi"
        className={INPUT}
      />
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-xs text-ink-muted">
          Jour
          <select name="weekday" defaultValue="4" className={INPUT}>
            {WEEKDAY_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Heure (Paris)
          <input name="time" type="time" required defaultValue="18:00" className={INPUT} />
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Format
          <select name="format" defaultValue="post" className={INPUT}>
            {SOCIAL_FORMATS.map((format) => (
              <option key={format.slug} value={format.slug}>
                {format.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Rappel (jours avant)
          <input name="remindDaysBefore" type="number" min={0} max={30} defaultValue={3} required className={`${INPUT} w-24`} />
        </label>
      </div>
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
              defaultChecked={network.slug === "instagram"}
              className="sr-only"
            />
            {network.label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Ajout..." : "Ajouter le créneau"}
        </button>
        <Feedback state={state} pending={pending} savedLabel="Créneau ajouté" />
      </div>
    </form>
  );
}

export function MonthlyStatsForm({
  action,
  defaultYear,
  defaultMonth,
}: {
  action: Action;
  defaultYear: number;
  defaultMonth: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess: true });
  const years = [defaultYear + 1, defaultYear, defaultYear - 1, defaultYear - 2];
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-xs text-ink-muted">
          Mois
          <select name="month" defaultValue={defaultMonth} className={INPUT}>
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Année
          <select name="year" defaultValue={defaultYear} className={INPUT}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Abonnés (fin de mois)
          <input name="followers" type="number" min={0} className={`${INPUT} w-32`} />
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Portée
          <input name="reach" type="number" min={0} className={`${INPUT} w-32`} />
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">
          Interactions
          <input name="interactions" type="number" min={0} className={`${INPUT} w-32`} />
        </label>
      </div>
      <textarea
        name="notes"
        rows={2}
        placeholder="Commentaire du mois pour le client (facultatif)"
        className={`${INPUT} resize-y`}
      />
      <p className="text-xs text-ink-muted">
        Un champ laissé vide reste « non renseigné » (pas 0). Le taux d&apos;engagement se calcule tout seul :
        interactions ÷ portée. Enregistrer un mois déjà saisi le remplace.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Enregistrement..." : "Enregistrer le mois"}
        </button>
        <Feedback state={state} pending={pending} savedLabel="Mois enregistré" />
      </div>
    </form>
  );
}

const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
