"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import { uploadDocument } from "@/lib/actions/files";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR - 1 + i);
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function DocumentUploadForm({
  clients,
  types,
  onSuccess,
}: {
  clients: { id: string; name: string }[];
  types: { id: string; label: string }[];
  /** Appelé après un envoi réussi — sert à refermer la modale (voir
   * NewDocumentButton), même contrat que `TaskForm`. */
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(uploadDocument, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [resetKey, setResetKey] = useState(0);
  const [isMonthlyInvoice, setIsMonthlyInvoice] = useState(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
      setResetKey((key) => key + 1);
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label htmlFor="clientId" className="text-sm font-medium text-ink">
          Client
        </label>
        <select
          id="clientId"
          name="clientId"
          required
          className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">Choisir un client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="typeId" className="text-sm font-medium text-ink">
          Type de document
        </label>
        <select
          id="typeId"
          name="typeId"
          required
          className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">Choisir un type</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="amountEuros" className="text-sm font-medium text-ink">
          Montant (€, optionnel)
        </label>
        <input
          id="amountEuros"
          name="amountEuros"
          type="text"
          inputMode="decimal"
          placeholder="Ex : 450.00"
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="dueDate" className="text-sm font-medium text-ink">
          Échéance (optionnel)
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="date"
          className="rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Rattachement d'une facture au mois convenu plutôt qu'à sa date de
          chargement (demande du 2026-07-31) — pour les clients facturés au
          forfait mensuel, utilisé par le rapprochement Temps &
          rentabilité de la section Finances (/admin/administratif). Les
          clients facturés à la tâche laissent la case décochée. */}
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="isMonthlyInvoice"
            checked={isMonthlyInvoice}
            onChange={(event) => setIsMonthlyInvoice(event.target.checked)}
            className="h-4 w-4 rounded border-line"
          />
          Facture mensuelle (client au forfait)
        </label>
        {isMonthlyInvoice && (
          <div className="flex flex-wrap gap-3">
            <select
              name="invoiceYear"
              required={isMonthlyInvoice}
              defaultValue={CURRENT_YEAR}
              className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              name="invoiceMonth"
              required={isMonthlyInvoice}
              className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Choisir un mois</option>
              {MONTH_NAMES.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Fichier (PDF)</span>
        <FilePicker key={resetKey} name="file" accept="application/pdf" required />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 text-sm text-danger sm:col-span-2">
          <WarningCircle size={16} weight="fill" />
          {state.error}
        </div>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Envoi..." : "Ajouter le document"}
        </button>
      </div>
    </form>
  );
}
