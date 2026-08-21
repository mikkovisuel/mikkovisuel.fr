"use client";

import { useTransition } from "react";
import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react/dist/ssr";
import {
  setTaskDeliverablesLockOverride,
  confirmTaskDeliverablesPayment,
  unconfirmTaskDeliverablesPayment,
} from "@/lib/actions/tasks";
import { isDeliverablesLocked } from "@/lib/deliverables-lock";
import { taskDateTimeFormatter } from "@/lib/tasks";

// Contrôle "Verrou paiement" sur la fiche tâche — pilote
// `Task.deliverablesLockOverride` (exception ponctuelle au réglage par
// défaut du client) et `Task.deliverablesPaymentConfirmedAt` (confirmation
// manuelle, indépendante de la facturation). Même trio pastille/select/
// bouton que `ProspectStatusSelect`/`TaskStatusSelect`, pas un nouveau
// pattern.
export function TaskPaymentLockControl({
  taskId,
  clientRequiresPayment,
  lockOverride,
  paymentConfirmedAt,
}: {
  taskId: string;
  clientRequiresPayment: boolean;
  lockOverride: string | null;
  paymentConfirmedAt: Date | null;
}) {
  const [isPending, startTransition] = useTransition();
  const locked = isDeliverablesLocked(
    { deliverablesLockOverride: lockOverride, deliverablesPaymentConfirmedAt: paymentConfirmedAt },
    { requirePaymentForDeliverables: clientRequiresPayment },
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          locked
            ? "border-danger/40 bg-danger/10 text-danger"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {locked ? <LockSimple size={12} weight="bold" /> : <LockSimpleOpen size={12} weight="bold" />}
        {locked ? "Livrables verrouillés" : "Livrables débloqués"}
      </span>

      <select
        key={lockOverride ?? "default"}
        defaultValue={lockOverride ?? ""}
        disabled={isPending}
        onChange={(event) => {
          const value = event.target.value;
          startTransition(() => {
            setTaskDeliverablesLockOverride(taskId, value);
          });
        }}
        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
      >
        <option value="">Suivre le réglage client ({clientRequiresPayment ? "verrouillé" : "libre"})</option>
        <option value="locked">Toujours verrouillé pour cet évènement</option>
        <option value="unlocked">Toujours débloqué pour cet évènement</option>
      </select>

      {paymentConfirmedAt ? (
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          Payé le {taskDateTimeFormatter.format(paymentConfirmedAt)}
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => unconfirmTaskDeliverablesPayment(taskId))}
            className="text-ink-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-ink disabled:opacity-60"
          >
            Annuler
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => confirmTaskDeliverablesPayment(taskId))}
          className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
        >
          Marquer comme payé
        </button>
      )}
    </div>
  );
}
