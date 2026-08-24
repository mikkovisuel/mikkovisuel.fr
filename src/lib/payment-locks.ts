// Deux verrous paiement indépendants sur une tâche, même mécanique
// tri-état pour les deux : un réglage par défaut au niveau du client, une
// exception ponctuelle par évènement (`null` = suit le client, "locked"/
// "unlocked" = force), et une confirmation manuelle posée par l'admin
// (jamais automatique, indépendante du système de facturation).
//
// - `isDeliverablesLocked` : accès aux livrables finaux (jamais les BAT).
// - `isWorkLocked` : démarrage du travail — bloque réellement la sortie du
//   statut "Nouveau" (voir `setTaskStatus`, src/lib/actions/tasks.ts).
function isLocked(override: string | null, confirmedAt: Date | null, clientDefault: boolean): boolean {
  const gatingApplies = override === "unlocked" ? false : override === "locked" ? true : clientDefault;
  return gatingApplies && confirmedAt === null;
}

export function isDeliverablesLocked(
  task: {
    deliverablesLockOverride: string | null;
    deliverablesPaymentConfirmedAt: Date | null;
  },
  client: { requirePaymentForDeliverables: boolean },
): boolean {
  return isLocked(task.deliverablesLockOverride, task.deliverablesPaymentConfirmedAt, client.requirePaymentForDeliverables);
}

export function isWorkLocked(
  task: {
    workLockOverride: string | null;
    workPaymentConfirmedAt: Date | null;
  },
  client: { requirePaymentBeforeWork: boolean },
): boolean {
  return isLocked(task.workLockOverride, task.workPaymentConfirmedAt, client.requirePaymentBeforeWork);
}
