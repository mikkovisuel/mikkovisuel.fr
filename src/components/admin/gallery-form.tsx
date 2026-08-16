"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { GalleryFormState } from "@/lib/validation/portfolio";

// Formulaire d'une galerie (titre + texte avant/après ses médias — demande
// du 2026-08-16, façon Adobe Portfolio). Les deux textes sont facultatifs
// et indépendants : laisser vide n'affiche simplement pas le bloc côté
// public, pas de valeur par défaut à restaurer.
export function GalleryForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: GalleryFormState, formData: FormData) => Promise<GalleryFormState>;
  defaultValues?: { title: string; textBefore: string; textAfter: string };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-ink">
          Titre de la galerie
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaultValues?.title}
          className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Ex : Warehouse #04"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="textBefore" className="text-sm font-medium text-ink">
          Texte avant les médias <span className="text-ink-muted">(facultatif)</span>
        </label>
        <textarea
          id="textBefore"
          name="textBefore"
          rows={4}
          defaultValue={defaultValues?.textBefore}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Présentation du projet, contexte, brief..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="textAfter" className="text-sm font-medium text-ink">
          Texte après les médias <span className="text-ink-muted">(facultatif)</span>
        </label>
        <textarea
          id="textAfter"
          name="textAfter"
          rows={4}
          defaultValue={defaultValues?.textAfter}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="Résultat, crédits, remerciements..."
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <WarningCircle size={18} weight="fill" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 text-sm text-accent">
          <CheckCircle size={16} weight="fill" />
          Galerie enregistrée.
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
