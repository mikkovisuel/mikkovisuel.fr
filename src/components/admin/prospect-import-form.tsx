"use client";

import { useActionState } from "react";
import { WarningCircle, CheckCircle, UploadSimple, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { importProspectsFromCsv } from "@/lib/actions/prospects";

export function ProspectImportForm() {
  const [state, formAction, pending] = useActionState(importProspectsFromCsv, undefined);

  return (
    <details className="rounded-2xl border border-line p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
        <UploadSimple size={16} weight="regular" />
        Importer un fichier CSV
      </summary>
      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <a
          href="/modele-import-prospects.csv"
          download
          className="inline-flex w-fit items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <DownloadSimple size={16} weight="regular" />
          Télécharger le modèle CSV
        </a>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-accent-ink"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="ml-auto inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Import en cours..." : "Importer"}
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Colonnes reconnues (accents/majuscules non sensibles) : nom (obligatoire), entreprise,
          adresse, téléphone, email, instagram, site web, notes. Les doublons (email/Instagram déjà
          présents) sont ignorés automatiquement.
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
