"use client";

import { useActionState, useRef, useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { createPaymentRecord } from "@/lib/actions/payment-records";
import { useFormSubmit } from "@/lib/use-form-submit";

export function PaymentRecordForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createPaymentRecord, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} onSubmit={formSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="prclientId" className="text-sm font-medium text-ink">
          Client
        </label>
        <select
          id="prclientId"
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
        <label htmlFor="label" className="text-sm font-medium text-ink">
          Libellé <span className="text-ink-muted">(facultatif)</span>
        </label>
        <input
          id="label"
          name="label"
          type="text"
          placeholder="Ex : Acompte virement"
          className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="amountEuros" className="text-sm font-medium text-ink">
          Montant (€)
        </label>
        <input
          id="amountEuros"
          name="amountEuros"
          type="text"
          inputMode="decimal"
          required
          placeholder="Ex : 200.00"
          className="w-32 rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="prDate" className="text-sm font-medium text-ink">
          Mois affecté
        </label>
        <input
          id="prDate"
          name="date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
      >
        {pending ? "Ajout..." : "Ajouter"}
      </button>
      {state?.error && (
        <span className="flex items-center gap-1 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          {state.error}
        </span>
      )}
    </form>
  );
}
