"use client";

import { useActionState, useState } from "react";
import {
  WarningCircle,
  CheckCircle,
  UploadSimple,
  DownloadSimple,
  Table,
} from "@phosphor-icons/react/dist/ssr";
import { importProspectsFromCsv, importProspectsFromGoogleSheet } from "@/lib/actions/prospects";
import { useFormSubmit } from "@/lib/use-form-submit";

const RECOGNIZED_COLUMNS_HELP =
  "Colonnes reconnues (accents/majuscules non sensibles) : nom (obligatoire), entreprise, " +
  "adresse, téléphone, email, instagram, site web, notes. Les doublons (email/Instagram déjà " +
  "présents) sont ignorés automatiquement.";

function CsvFileImport() {
  const [state, formAction, pending] = useActionState(importProspectsFromCsv, undefined);
  const { formRef, onSubmit: formSubmit } = useFormSubmit(formAction, {
    pending,
    state,
    resetOnSuccess: true,
  });

  return (
    <form action={formAction} onSubmit={formSubmit} ref={formRef} className="mt-4 flex flex-col gap-3">
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
      <p className="text-xs text-ink-muted">{RECOGNIZED_COLUMNS_HELP}</p>
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
  );
}

// Import direct depuis un Google Sheet (demande du 2026-08-17) — aucune
// connexion Google requise côté admin (contrairement à l'intégration
// Gmail) : il suffit de partager la feuille en lecture et de coller son
// lien, voir src/lib/actions/prospects.ts pour la mécanique d'export CSV
// côté serveur.
function GoogleSheetImport() {
  const [state, formAction, pending] = useActionState(importProspectsFromGoogleSheet, undefined);
  const { formRef, onSubmit: formSubmit } = useFormSubmit(formAction, {
    pending,
    state,
    resetOnSuccess: true,
  });

  return (
    <form action={formAction} onSubmit={formSubmit} ref={formRef} className="mt-4 flex flex-col gap-3">
      <p className="text-xs text-ink-muted">
        Dans Google Sheets : <span className="font-medium text-ink">Partager</span> →{" "}
        <span className="font-medium text-ink">Toute personne disposant du lien</span> → rôle{" "}
        <span className="font-medium text-ink">Lecteur</span>, puis collez le lien copié ci-dessous.
      </p>
      <input
        type="url"
        name="sheetUrl"
        required
        placeholder="https://docs.google.com/spreadsheets/d/..."
        className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
      <p className="text-xs text-ink-muted">{RECOGNIZED_COLUMNS_HELP}</p>
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
  );
}

export function ProspectImportForm() {
  const [source, setSource] = useState<"fichier" | "sheet">("fichier");

  return (
    <details className="rounded-2xl border border-line p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
        <UploadSimple size={16} weight="regular" />
        Importer des prospects
      </summary>

      <div className="mt-4 inline-flex rounded-full border border-line p-1 text-sm">
        <button
          type="button"
          onClick={() => setSource("fichier")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
            source === "fichier" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
          }`}
        >
          <UploadSimple size={14} weight="regular" />
          Fichier CSV
        </button>
        <button
          type="button"
          onClick={() => setSource("sheet")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
            source === "sheet" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Table size={14} weight="regular" />
          Google Sheets
        </button>
      </div>

      {source === "fichier" ? <CsvFileImport /> : <GoogleSheetImport />}
    </details>
  );
}
