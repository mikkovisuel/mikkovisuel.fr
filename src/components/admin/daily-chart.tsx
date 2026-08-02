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
  /** Temps réellement chronométré sur les tâches de ce jour, tous jours
   * confondus (une tâche peut déjà avoir été travaillée avant son
   * échéance/évènement) — sert à calculer le temps restant ci-dessous. */
  actualMinutes: number;
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

          // Temps restant = prévu moins ce qui a déjà été réellement
          // travaillé sur ces tâches (demande du 2026-08-01) — jamais
          // négatif : un dépassement de l'estimation n'est pas un "temps
          // restant négatif", juste "plus rien à consommer sur l'estimation".
          const remainingMinutes = Math.max(0, day.committedMinutes - day.actualMinutes);
          const remainingRatio = capacity && capacity > 0 ? Math.min(1, remainingMinutes / capacity) : 0;
          const overrun = day.actualMinutes > day.committedMinutes;

          return (
            <div
              key={day.date}
              className={`rounded-lg px-2 py-2.5 ${day.isToday ? "bg-accent/10 ring-1 ring-accent/40" : ""}`}
            >
              <div className="grid grid-cols-[9rem_minmax(0,1fr)_5.5rem_1.5rem] items-center gap-3">
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
              {/* Barre de temps réel restant (demande du 2026-08-01) :
                  prévu moins ce qui a déjà été chronométré sur ces mêmes
                  tâches, pas seulement le prévu brut. */}
              <div className="mt-1.5 grid grid-cols-[9rem_minmax(0,1fr)_5.5rem_1.5rem] items-center gap-3">
                <span className="pl-1 text-xs text-ink-muted">Reste</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                  <div className="h-full rounded-full bg-ink-muted/60" style={{ width: `${remainingRatio * 100}%` }} />
                </div>
                <span className="whitespace-nowrap text-right text-xs text-ink-muted">
                  {overrun ? (
                    <span className="text-(--status-warning)">
                      Dépassé de {formatHoursFromMinutes(day.actualMinutes - day.committedMinutes)}
                    </span>
                  ) : (
                    formatHoursFromMinutes(remainingMinutes)
                  )}
                </span>
                <span />
              </div>
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
