"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import { uploadDocument } from "@/lib/actions/files";

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
