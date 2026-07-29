type WeekEntry = { key: string; label: string; count: number };

// Seuils de charge par semaine — vert en dessous, orange à partir de 4
// tâches actives, rouge à partir de 7. Approximation raisonnable pour une
// activité solo ; à ajuster si le rythme réel de Mikko diffère.
function loadColor(count: number): "green" | "orange" | "red" {
  if (count >= 7) return "red";
  if (count >= 4) return "orange";
  return "green";
}

const BAR_CLASSES = {
  green: "bg-emerald-500",
  orange: "bg-amber-500",
  red: "bg-danger",
};

export function WorkloadChart({ data }: { data: WeekEntry[] }) {
  const max = Math.max(1, ...data.map((entry) => entry.count));

  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="mb-4 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Charge normale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          Chargée (4+)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-danger" />
          Surcharge (7+)
        </span>
      </div>
      <div className="flex items-end gap-3 overflow-x-auto pb-2">
        {data.map((entry) => (
          <div key={entry.key} className="flex min-w-[40px] flex-col items-center gap-2">
            <span className="text-xs text-ink-muted">{entry.count}</span>
            <div className="flex h-40 w-6 items-end overflow-hidden rounded-t-md bg-surface-elevated">
              <div
                className={`w-full rounded-t-md ${BAR_CLASSES[loadColor(entry.count)]}`}
                style={{ height: `${(entry.count / max) * 100}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs text-ink-muted">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
