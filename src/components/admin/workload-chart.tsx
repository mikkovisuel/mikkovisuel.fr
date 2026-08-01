import { formatHoursFromMinutes } from "@/lib/time-tracking";
import { capacityAlertLevel } from "@/lib/capacity";
import { STATUS_BAR, STATUS_TEXT, STATUS_ICON, STATUS_VARS, type ChartStatus } from "@/components/admin/chart-status";

type WeekEntry = {
  key: string;
  label: string;
  /** Somme des `estimatedMinutes` des tâches de la semaine. */
  estimatedMinutes: number;
  /** Nombre total de tâches de la semaine, estimées ou non. */
  taskCount: number;
  /** Tâches sans estimation : elles ne pèsent rien dans la hauteur de barre,
   * il faut donc les signaler séparément plutôt que de les perdre. */
  unestimatedCount: number;
  /** Capacité réellement saisie sur la semaine (minutes), si disponible. */
  capacityMinutes?: number;
};

// Seuils exprimés en **heures de travail estimées** par semaine, et non plus
// en nombre de tâches (changement du 2026-07-30) : trois flyers et trois
// aftermovies pesaient identiquement, ce qui rendait le graphique inutile
// pour anticiper une surcharge. `estimatedMinutes` était déjà saisi sur
// chaque tâche mais n'était exploité que par la jauge d'une fiche.
//
// Repères pour une activité solo : ~25 h de production effective par semaine
// est déjà une semaine chargée, au-delà de 40 h c'est une surcharge. À
// ajuster ici si le rythme réel diffère.
const BUSY_HOURS = 25;
const OVERLOAD_HOURS = 40;

// Priorité à la capacité réellement saisie (`WorkCapacityDay`) quand elle
// existe pour la semaine ; repli sur les seuils fixes ci-dessus sinon
// (demande du 2026-07-31 : le moteur de capacité vient compléter le
// graphique existant, pas le remplacer tant qu'aucune capacité n'est saisie).
function loadStatus(entry: Pick<WeekEntry, "estimatedMinutes" | "capacityMinutes">): ChartStatus {
  if (entry.capacityMinutes !== undefined && entry.capacityMinutes > 0) {
    const level = capacityAlertLevel(entry.capacityMinutes, entry.estimatedMinutes);
    if (level === "overload") return "critical";
    if (level === "warning") return "warning";
    return "good";
  }
  const hours = entry.estimatedMinutes / 60;
  if (hours >= OVERLOAD_HOURS) return "critical";
  if (hours >= BUSY_HOURS) return "warning";
  return "good";
}

const STATUS_LABEL: Record<ChartStatus, string> = {
  good: "Charge normale",
  warning: `Chargée (${BUSY_HOURS} h+)`,
  critical: `Surcharge (${OVERLOAD_HOURS} h+)`,
};

export function WorkloadChart({ data }: { data: WeekEntry[] }) {
  // Plancher à 60 min pour que quelques semaines très légères ne produisent
  // pas des barres factices occupant toute la hauteur.
  const max = Math.max(60, ...data.map((entry) => Math.max(entry.estimatedMinutes, entry.capacityMinutes ?? 0)));
  const totalUnestimated = data.reduce((sum, entry) => sum + entry.unestimatedCount, 0);
  const hasCapacityData = data.some((entry) => entry.capacityMinutes !== undefined && entry.capacityMinutes > 0);

  return (
    <div className="rounded-2xl border border-line p-5" style={STATUS_VARS}>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        {(["good", "warning", "critical"] as const).map((status) => (
          <span key={status} className={`flex items-center gap-1.5 ${STATUS_TEXT[status]}`}>
            {STATUS_ICON[status]}
            <span className="text-ink-muted">{STATUS_LABEL[status]}</span>
          </span>
        ))}
        {hasCapacityData && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-3 border-t-2 border-dashed border-ink-muted" />
            Capacité saisie
          </span>
        )}
      </div>
      {hasCapacityData && (
        <p className="mb-3 text-xs text-ink-muted">
          Seuils {BUSY_HOURS} h / {OVERLOAD_HOURS} h utilisés à défaut de capacité saisie ; les
          semaines avec capacité renseignée sont comparées à celle-ci (repère en pointillés).
        </p>
      )}

      <div className="flex items-end gap-3 overflow-x-auto pb-2">
        {data.map((entry) => {
          const status = loadStatus(entry);
          const hasCapacity = entry.capacityMinutes !== undefined && entry.capacityMinutes > 0;
          return (
            <div key={entry.key} className="flex min-w-[52px] flex-col items-center gap-2">
              <span className="text-xs text-ink-muted">{formatHoursFromMinutes(entry.estimatedMinutes)}</span>
              <div
                tabIndex={0}
                aria-label={`${entry.label} : ${entry.taskCount} tâche${entry.taskCount > 1 ? "s" : ""}, ${formatHoursFromMinutes(entry.estimatedMinutes)} estimées${hasCapacity ? `, ${formatHoursFromMinutes(entry.capacityMinutes!)} de capacité saisie` : ""}`}
                className="group relative flex h-40 w-6 items-end overflow-visible rounded-t bg-surface-elevated focus:outline-none"
              >
                {/* Infobulle personnalisée (CSS pur, sans JS) : remplace
                    l'ancien `title` du navigateur — même contenu, accessible
                    au clavier via `group-focus`, pas seulement à la souris. */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[14rem] -translate-x-1/2 rounded-lg border border-line bg-surface-elevated px-3 py-2 text-xs text-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  <p className="font-medium">{entry.label}</p>
                  <p className="mt-0.5 text-ink-muted">
                    {entry.taskCount} tâche{entry.taskCount > 1 ? "s" : ""} ·{" "}
                    <span className={STATUS_TEXT[status]}>{formatHoursFromMinutes(entry.estimatedMinutes)}</span>{" "}
                    estimées
                  </p>
                  {hasCapacity && (
                    <p className="mt-0.5 text-ink-muted">
                      {formatHoursFromMinutes(entry.capacityMinutes!)} de capacité saisie
                    </p>
                  )}
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 overflow-hidden rounded-t"
                  style={{ height: "100%" }}
                >
                  <div
                    className={`absolute bottom-0 w-full rounded-t transition-[height] ${STATUS_BAR[status]}`}
                    style={{ height: `${(entry.estimatedMinutes / max) * 100}%` }}
                  />
                  {/* Repère de capacité (demande du 2026-07-31) : une ligne à
                      la hauteur de la capacité saisie, superposée sur la même
                      échelle que la barre — un seul axe, pas un second, donc
                      pas de graphique à double échelle. */}
                  {hasCapacity && (
                    <div
                      className="absolute inset-x-0 border-t-2 border-dashed border-ink-muted"
                      style={{ bottom: `${Math.min(100, (entry.capacityMinutes! / max) * 100)}%` }}
                    />
                  )}
                </div>
              </div>
              {/* Une tâche sans estimation ne peut pas être convertie en hauteur
                  de barre sans inventer une durée : on la signale explicitement
                  plutôt que de la laisser peser zéro en silence. */}
              {entry.unestimatedCount > 0 && (
                <span
                  className="rounded-full border border-line px-1.5 text-[10px] text-ink-muted"
                  title={`${entry.unestimatedCount} tâche${entry.unestimatedCount > 1 ? "s" : ""} sans temps estimé — non comptée${entry.unestimatedCount > 1 ? "s" : ""} dans la hauteur de la barre`}
                >
                  +{entry.unestimatedCount}
                </span>
              )}
              <span className="whitespace-nowrap text-xs text-ink-muted">{entry.label}</span>
            </div>
          );
        })}
      </div>

      {totalUnestimated > 0 && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
          <span className="rounded-full border border-line px-1.5">+n</span> ={" "}
          {totalUnestimated} tâche{totalUnestimated > 1 ? "s" : ""} sans temps estimé sur la
          période, donc absente{totalUnestimated > 1 ? "s" : ""}{" "}
          de la hauteur des barres. Renseignez leur estimation depuis leur fiche pour
          qu&apos;elles pèsent dans la charge.
        </p>
      )}
    </div>
  );
}
