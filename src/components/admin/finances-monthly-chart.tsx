type MonthlyEntry = {
  key: string;
  label: string;
  billedCents: number;
  collectedCents: number;
};

export function FinancesMonthlyChart({
  data,
  currency,
}: {
  data: MonthlyEntry[];
  currency: string;
}) {
  const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency });
  const max = Math.max(1, ...data.map((entry) => entry.billedCents));

  return (
    <div className="mt-4 rounded-2xl border border-line p-5">
      <div className="mb-4 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent/40" />
          Facturé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          Encaissé
        </span>
      </div>
      <div className="flex items-end gap-4 overflow-x-auto pb-2">
        {data.map((entry) => (
          <div key={entry.key} className="flex min-w-[52px] flex-col items-center gap-2">
            <div className="relative flex h-40 w-8 items-end overflow-hidden rounded-t-md bg-surface-elevated">
              <div
                className="w-full bg-accent/40"
                style={{ height: `${(entry.billedCents / max) * 100}%` }}
                title={`Facturé : ${formatter.format(entry.billedCents / 100)}`}
              />
              <div
                className="absolute bottom-0 w-full bg-accent"
                style={{ height: `${(entry.collectedCents / max) * 100}%` }}
                title={`Encaissé : ${formatter.format(entry.collectedCents / 100)}`}
              />
            </div>
            <span className="whitespace-nowrap text-xs text-ink-muted">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
