import { capacityAlertLevel } from "@/lib/capacity";
import { formatHoursFromMinutes } from "@/lib/time-tracking";
import { STATUS_BAR, STATUS_ICON, STATUS_TEXT, STATUS_VARS, type ChartStatus } from "@/components/admin/chart-status";

export type DailyEntry = {
  date: string;
  dayLabel: string;
  committedMinutes: number;
  taskCount: number;
  /** Capacité saisie pour ce jour précis, `null` si non renseignée. */
  capacityMinutes: number | null;
  isToday?: boolean;
};

// Vue jour (demande du 2026-08-01, "vue par jours en sélectionnant la
// semaine") : une ligne par jour de la semaine choisie, jauge horizontale
// charge/capacité — complète la vue semaine par un niveau de détail plus
// fin, pour une semaine à la fois plutôt que les 16 semaines de la vue
// hebdomadaire.
export function DailyChart({
  days,
  averageDailyCapacityMinutes,
}: {
  days: DailyEntry[];
  /** Capacité journalière moyenne (capacité hebdomadaire moyenne / 7), repli
   * pour un jour sans capacité propre — même logique que la vue semaine. */
  averageDailyCapacityMinutes: number | null;
}) {
  return (
    <div className="rounded-2xl border border-line p-5" style={STATUS_VARS}>
      <div className="flex flex-col divide-y divide-line">
        {days.map((day) => {
          const capacity = day.capacityMinutes ?? averageDailyCapacityMinutes;
          const hasOwnCapacity = day.capacityMinutes !== null;
          const status: ChartStatus | null =
            capacity !== null && capacity > 0 ? capacityAlertLevelToStatus(capacity, day.committedMinutes) : null;
          const ratio = capacity && capacity > 0 ? Math.min(1, day.committedMinutes / capacity) : 0;

          return (
            <div
              key={day.date}
              className={`grid grid-cols-[9rem_minmax(0,1fr)_5.5rem_1.5rem] items-center gap-3 rounded-lg px-2 py-2.5 ${
                day.isToday ? "bg-accent/10 ring-1 ring-accent/40" : ""
              }`}
            >
              <span className={`text-sm ${day.isToday ? "font-medium text-ink" : "text-ink"}`}>{day.dayLabel}</span>
              <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className={`h-full rounded-full ${status ? STATUS_BAR[status] : "bg-ink-muted/40"}`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-right text-xs text-ink-muted">
                {formatHoursFromMinutes(day.committedMinutes)}
                {capacity !== null && capacity > 0 && ` / ${formatHoursFromMinutes(capacity)}${hasOwnCapacity ? "" : "*"}`}
              </span>
              <span className={status ? STATUS_TEXT[status] : "text-ink-muted"}>
                {status ? STATUS_ICON[status] : <span className="block h-3 w-3">—</span>}
              </span>
            </div>
          );
        })}
      </div>
      {averageDailyCapacityMinutes !== null && days.some((d) => d.capacityMinutes === null) && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
          * Capacité moyenne ({formatHoursFromMinutes(Math.round(averageDailyCapacityMinutes))}/jour), ce jour
          n&apos;ayant pas sa propre capacité saisie.
        </p>
      )}
    </div>
  );
}

function capacityAlertLevelToStatus(capacityMinutes: number, committedMinutes: number): ChartStatus {
  const level = capacityAlertLevel(capacityMinutes, committedMinutes);
  if (level === "overload") return "critical";
  if (level === "warning") return "warning";
  return "good";
}
