"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { searchProspectsWithAI } from "@/lib/actions/prospects";
import type { ProspectSearchState } from "@/lib/validation/prospect";

export function ProspectSearchForm() {
  const [state, formAction, pending] = useActionState<ProspectSearchState, FormData>(
    searchProspectsWithAI,
    undefined,
  );

  return (
    <details className="rounded-2xl border border-line p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
        <MagnifyingGlass size={16} weight="regular" />
        Rechercher des prospects (IA)
      </summary>
      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <textarea
          name="query"
          required
          rows={2}
          placeholder="Ex. photographes de mariage indépendants à Lyon, actifs sur Instagram"
          className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="limit" className="text-sm text-ink-muted">
            Nombre max de résultats
          </label>
          <input
            id="limit"
            name="limit"
            type="number"
            min={1}
            max={15}
            defaultValue={8}
            className="w-20 rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={pending}
            className="ml-auto inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Recherche en cours..." : "Lancer la recherche"}
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Recherche sur le web via l&apos;API Anthropic : n&apos;invente aucune coordonnée, laisse un
          champ vide si l&apos;information n&apos;est pas trouvée publiquement. Vérifiez les fiches
          ajoutées avant tout envoi.
        </p>
        {state?.error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </div>
        )}
        {state?.message && (
          <div className="flex items-center gap-2 text-sm text-accent">
            <CheckCircle size={16} weight="fill" />
            {state.message}
          </div>
        )}
      </form>
    </details>
  );
}
