import {
  formatDurationShort,
  timeGaugeColor,
  TIME_GAUGE_BAR_CLASSES,
  TIME_GAUGE_TEXT_CLASSES,
} from "@/lib/time-tracking";

// Jauge temps passé / temps estimé — vert dans les temps, orange à partir de
// 80 % de l'estimation, rouge au-delà de 100 %. Sans temps estimé, affiche
// juste le temps passé en texte (rien à comparer, pas de jauge trompeuse).
export function TaskTimeGauge({
  spentMs,
  estimatedMinutes,
  compact = false,
}: {
  spentMs: number;
  estimatedMinutes: number | null;
  compact?: boolean;
}) {
  const spentLabel = formatDurationShort(spentMs);

  if (!estimatedMinutes) {
    return <span className="text-sm text-ink-muted">{spentLabel}</span>;
  }

  const spentMinutes = spentMs / 60_000;
  const color = timeGaugeColor(spentMinutes, estimatedMinutes);
  const pct = Math.min(100, Math.round((spentMinutes / estimatedMinutes) * 100));

  return (
    <div className={compact ? "w-24" : "w-40"}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full ${TIME_GAUGE_BAR_CLASSES[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1 text-xs ${TIME_GAUGE_TEXT_CLASSES[color]}`}>
        {spentLabel} / {formatDurationShort(estimatedMinutes * 60_000)}
      </p>
    </div>
  );
}
