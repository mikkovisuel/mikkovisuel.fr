import Link from "next/link";
import type { ClientTimeRow } from "@/lib/time-report";
import { formatHoursFromMinutes } from "@/lib/time-tracking";

export function TimeReportTable({
  rows,
  currency,
}: {
  rows: ClientTimeRow[];
  currency: string;
}) {
  const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency });
  const totalMs = rows.reduce((sum, row) => sum + row.spentMs, 0);
  const totalBilled = rows.reduce((sum, row) => sum + row.billedCents, 0);

  // Le taux global ne se calcule que sur les clients où **les deux** grandeurs
  // sont suivies. Diviser le facturé total par le temps total gonflerait
  // artificiellement le taux, puisque des clients facturés sans chrono
  // apportent du chiffre d'affaires sans apporter d'heures — c'est la même
  // erreur que celle évitée ligne par ligne (voir `hourlyRateCents`).
  const comparable = rows.filter((row) => row.hourlyRateCents !== null);
  const comparableMs = comparable.reduce((sum, row) => sum + row.spentMs, 0);
  const comparableBilled = comparable.reduce((sum, row) => sum + row.billedCents, 0);
  const globalRate =
    comparableMs >= 60_000 && comparableBilled > 0
      ? comparableBilled / 100 / (comparableMs / 3_600_000)
      : null;
  const excludedCount = rows.length - comparable.length;

  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink-muted">
        Aucun temps suivi ni facture sur cette période.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
            <th className="px-5 py-3 font-medium">Client</th>
            <th className="px-5 py-3 text-right font-medium">Temps passé</th>
            <th className="px-5 py-3 text-right font-medium">Facturé</th>
            <th className="px-5 py-3 text-right font-medium">Taux horaire réel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.clientId} className="transition-colors hover:bg-surface-elevated">
              <td className="px-5 py-3">
                <Link
                  href={`/admin/clients/${row.clientId}`}
                  className="font-medium text-ink transition-colors hover:text-accent"
                >
                  {row.clientName}
                </Link>
                {row.archived && (
                  <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-muted">
                    archivé
                  </span>
                )}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-ink">
                {row.spentMs > 0 ? formatHoursFromMinutes(row.spentMs / 60000) : "—"}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-ink">
                {row.billedCents > 0 ? money.format(row.billedCents / 100) : "—"}
              </td>
              <td className="px-5 py-3 text-right tabular-nums">
                {/* Volontairement "—" et non un chiffre quand l'une des deux
                    grandeurs manque : un client facturé sans temps suivi
                    afficherait un taux infini, un client suivi sans facture
                    un taux nul. Voir `hourlyRateCents`. */}
                {row.hourlyRateCents !== null ? (
                  <span className="font-medium text-ink">
                    {money.format(row.hourlyRateCents / 100)}/h
                  </span>
                ) : (
                  <span
                    className="text-ink-muted"
                    title={
                      row.billedCents <= 0
                        ? "Pas encore facturé sur cette période"
                        : "Temps non suivi sur cette période"
                    }
                  >
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line text-ink">
            <td className="px-5 py-3 font-medium">Total</td>
            <td className="px-5 py-3 text-right font-medium tabular-nums">
              {formatHoursFromMinutes(totalMs / 60000)}
            </td>
            <td className="px-5 py-3 text-right font-medium tabular-nums">
              {money.format(totalBilled / 100)}
            </td>
            <td
              className="px-5 py-3 text-right font-medium tabular-nums"
              title={
                excludedCount > 0
                  ? `Calculé sur les ${comparable.length} client${comparable.length > 1 ? "s" : ""} où temps et facturation sont tous deux suivis`
                  : undefined
              }
            >
              {globalRate !== null ? `${money.format(globalRate)}/h` : "—"}
            </td>
          </tr>
        </tfoot>
      </table>

      {excludedCount > 0 && (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
          Taux horaire global calculé sur les {comparable.length} client
          {comparable.length > 1 ? "s" : ""} où temps <em>et</em> facturation sont suivis.{" "}
          {excludedCount} ligne{excludedCount > 1 ? "s" : ""} en sont exclue
          {excludedCount > 1 ? "s" : ""} : les inclure fausserait le calcul.
        </p>
      )}
    </div>
  );
}
