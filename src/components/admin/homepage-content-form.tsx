"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { updateHomepageContent } from "@/lib/actions/homepage-content";
import { useFormSubmit } from "@/lib/use-form-submit";

export function HomepageContentForm({
  defaultValues,
}: {
  defaultValues: {
    heroTitle: string;
    heroSubtitle: string;
    heroButtonLabel: string;
    portfolioTitle: string;
    portfolioSubtitle: string;
  };
}) {
  const [state, formAction, pending] = useActionState(updateHomepageContent, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });

  return (
    <form action={formAction} onSubmit={formSubmit} className="grid gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="heroTitle" className="text-sm font-medium text-ink">
          Titre principal (Hero)
        </label>
        <textarea
          id="heroTitle"
          name="heroTitle"
          rows={2}
          defaultValue={defaultValues.heroTitle}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="heroSubtitle" className="text-sm font-medium text-ink">
          Sous-titre (Hero)
        </label>
        <textarea
          id="heroSubtitle"
          name="heroSubtitle"
          rows={2}
          defaultValue={defaultValues.heroSubtitle}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="heroButtonLabel" className="text-sm font-medium text-ink">
          Texte du bouton (Hero)
        </label>
        <input
          id="heroButtonLabel"
          name="heroButtonLabel"
          defaultValue={defaultValues.heroButtonLabel}
          className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="portfolioTitle" className="text-sm font-medium text-ink">
          Titre de la section portfolio
        </label>
        <textarea
          id="portfolioTitle"
          name="portfolioTitle"
          rows={2}
          defaultValue={defaultValues.portfolioTitle}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="portfolioSubtitle" className="text-sm font-medium text-ink">
          Sous-titre de la section portfolio
        </label>
        <textarea
          id="portfolioSubtitle"
          name="portfolioSubtitle"
          rows={2}
          defaultValue={defaultValues.portfolioSubtitle}
          className="resize-none rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 text-sm text-accent">
          <CheckCircle size={16} weight="fill" />
          Contenu enregistré.
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
      <p className="text-xs text-ink-muted">
        Laisser un champ vide restaure le texte par défaut.
      </p>
    </form>
  );
}
