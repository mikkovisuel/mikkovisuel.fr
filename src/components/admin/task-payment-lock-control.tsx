"use client";

import { useTransition } from "react";
import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react/dist/ssr";
import {
  setTaskDeliverablesLockOverride,
  confirmTaskDeliverablesPayment,
  unconfirmTaskDeliverablesPayment,
  setTaskWorkLockOverride,
  confirmTaskWorkPayment,
  unconfirmTaskWorkPayment,
} from "@/lib/actions/tasks";
import { isDeliverablesLocked, isWorkLocked } from "@/lib/payment-locks";
import { taskDateTimeFormatter } from "@/lib/tasks";

const KIND_CONFIG = {
  livrables: {
    lockedLabel: "Livrables verrouillés",
    unlockedLabel: "Livrables débloqués",
    setOverride: setTaskDeliverablesLockOverride,
    confirm: confirmTaskDeliverablesPayment,
    unconfirm: unconfirmTaskDeliverablesPayment,
  },
  travail: {
    lockedLabel: "Travail verrouillé",
    unlockedLabel: "Travail débloqué",
    setOverride: setTaskWorkLockOverride,
    confirm: confirmTaskWorkPayment,
    unconfirm: unconfirmTaskWorkPayment,
  },
} as const;

// Contrôle "Verrou paiement" sur la fiche tâche — deux instances possibles
// (`kind`), même mécanique tri-état pour les deux (voir
// src/lib/payment-locks.ts) : "livrables" pilote l'accès aux livrables
// finaux, "travail" pilote le blocage réel du statut avant de commencer
// (voir `setTaskStatus`). Même trio pastille/select/bouton que
// `ProspectStatusSelect`/`TaskStatusSelect`, pas un nouveau pattern.
export function TaskPaymentLockControl({
  taskId,
  kind,
  clientRequiresPayment,
  lockOverride,
  paymentConfirmedAt,
}: {
  taskId: string;
  kind: "livrables" | "travail";
  clientRequiresPayment: boolean;
  lockOverride: string | null;
  paymentConfirmedAt: Date | null;
}) {
  const [isPending, startTransition] = useTransition();
  const config = KIND_CONFIG[kind];
  const locked =
    kind === "livrables"
      ? isDeliverablesLocked(
          { deliverablesLockOverride: lockOverride, deliverablesPaymentConfirmedAt: paymentConfirmedAt },
          { requirePaymentForDeliverables: clientRequiresPayment },
        )
      : isWorkLocked(
          { workLockOverride: lockOverride, workPaymentConfirmedAt: paymentConfirmedAt },
          { requirePaymentBeforeWork: clientRequiresPayment },
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
        {locked ? config.lockedLabel : config.unlockedLabel}
      </span>

      <select
        key={lockOverride ?? "default"}
        defaultValue={lockOverride ?? ""}
        disabled={isPending}
        onChange={(event) => {
          const value = event.target.value;
          startTransition(() => {
            config.setOverride(taskId, value);
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
            onClick={() => startTransition(() => config.unconfirm(taskId))}
            className="text-ink-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-ink disabled:opacity-60"
          >
            Annuler
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => config.confirm(taskId))}
          className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
        >
          Marquer comme payé
        </button>
      )}
    </div>
  );
}
