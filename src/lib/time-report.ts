import { sumTaskTimeMs, type TimeEntryLike } from "@/lib/time-tracking";

// Croisement temps passé / montant facturé, par client et sur une période —
// la seule façon de savoir quels clients sont réellement rentables. Les deux
// sources existaient déjà séparément (chrono des tâches d'un côté, page
// Finances de l'autre) mais n'avaient jamais été rapprochées.

export interface ClientTimeRow {
  clientId: string;
  clientName: string;
  archived: boolean;
  spentMs: number;
  billedCents: number;
  /** Centimes par heure, ou `null` quand le rapport n'a pas de sens (voir
   * `hourlyRateCents`). */
  hourlyRateCents: number | null;
}

// Un taux horaire n'a de sens que si les deux grandeurs sont présentes :
//  - du temps mais aucune facture sur la période → ce n'est pas "0 €/h",
//    c'est "pas encore facturé" ;
//  - une facture mais aucun temps saisi → ce n'est pas un taux infini,
//    c'est "temps non suivi".
// Dans les deux cas on renvoie `null` et l'affichage montre "—" plutôt qu'un
// chiffre trompeur. Seuil d'une minute pour éviter qu'un chrono lancé puis
// arrêté par erreur ne produise un taux astronomique.
const MIN_TRACKED_MS = 60_000;

function hourlyRateCents(spentMs: number, billedCents: number): number | null {
  if (spentMs < MIN_TRACKED_MS || billedCents <= 0) return null;
  return Math.round(billedCents / (spentMs / 3_600_000));
}

export function buildClientTimeRows(input: {
  timeEntries: {
    startedAt: Date;
    endedAt: Date | null;
    task: { clientId: string; client: { name: string; archivedAt: Date | null } };
  }[];
  invoices: { clientId: string; amountCents: number | null; client: { name: string; archivedAt: Date | null } }[];
  now?: Date;
}): ClientTimeRow[] {
  const now = input.now ?? new Date();
  const rows = new Map<string, ClientTimeRow & { entries: TimeEntryLike[] }>();

  function ensure(clientId: string, name: string, archivedAt: Date | null) {
    let row = rows.get(clientId);
    if (!row) {
      row = {
        clientId,
        clientName: name,
        archived: archivedAt !== null,
        spentMs: 0,
        billedCents: 0,
        hourlyRateCents: null,
        entries: [],
      };
      rows.set(clientId, row);
    }
    return row;
  }

  for (const entry of input.timeEntries) {
    const row = ensure(entry.task.clientId, entry.task.client.name, entry.task.client.archivedAt);
    row.entries.push({ startedAt: entry.startedAt, endedAt: entry.endedAt });
  }
  for (const invoice of input.invoices) {
    const row = ensure(invoice.clientId, invoice.client.name, invoice.client.archivedAt);
    row.billedCents += invoice.amountCents ?? 0;
  }

  return Array.from(rows.values())
    .map(({ entries, ...row }) => {
      // Réutilise `sumTaskTimeMs` pour que le chrono encore en cours soit
      // compté jusqu'à maintenant, exactement comme sur la fiche tâche.
      const spentMs = sumTaskTimeMs(entries, now);
      return { ...row, spentMs, hourlyRateCents: hourlyRateCents(spentMs, row.billedCents) };
    })
    .filter((row) => row.spentMs > 0 || row.billedCents > 0)
    .sort((a, b) => b.spentMs - a.spentMs);
}
