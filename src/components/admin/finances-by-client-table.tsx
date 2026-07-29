import Link from "next/link";

type ClientEntry = {
  clientId: string;
  clientName: string;
  billedCents: number;
  collectedCents: number;
};

export function FinancesByClientTable({
  data,
  currency,
}: {
  data: ClientEntry[];
  currency: string;
}) {
  const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency });

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-muted">
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Facturé</th>
            <th className="px-4 py-3 font-medium">Encaissé</th>
            <th className="px-4 py-3 font-medium">Reste dû</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((entry) => (
            <tr key={entry.clientId}>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/clients/${entry.clientId}`}
                  className="text-ink transition-colors hover:text-accent"
                >
                  {entry.clientName}
                </Link>
              </td>
              <td className="px-4 py-3 text-ink">{formatter.format(entry.billedCents / 100)}</td>
              <td className="px-4 py-3 text-ink">{formatter.format(entry.collectedCents / 100)}</td>
              <td className="px-4 py-3 text-ink-muted">
                {formatter.format((entry.billedCents - entry.collectedCents) / 100)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
