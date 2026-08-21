// Calcule si les livrables finaux d'une tâche sont verrouillés en attente de
// paiement. Le verrou n'est jamais automatique : `deliverablesPaymentConfirmedAt`
// est posé à la main par l'admin (voir `confirmTaskDeliverablesPayment` dans
// src/lib/actions/tasks.ts), indépendamment du système de facturation — un
// évènement peut donc être débloqué avant même qu'une facture existe, ou
// resté verrouillé après un paiement Stripe/PayPal si l'admin veut garder la
// main. Ne s'applique jamais aux BAT (voir `Deliverable.kind`), seulement
// aux livrables `kind: "final"`.
export function isDeliverablesLocked(
  task: {
    deliverablesLockOverride: string | null;
    deliverablesPaymentConfirmedAt: Date | null;
  },
  client: { requirePaymentForDeliverables: boolean },
): boolean {
  const gatingApplies =
    task.deliverablesLockOverride === "unlocked"
      ? false
      : task.deliverablesLockOverride === "locked"
        ? true
        : client.requirePaymentForDeliverables;
  return gatingApplies && task.deliverablesPaymentConfirmedAt === null;
}
