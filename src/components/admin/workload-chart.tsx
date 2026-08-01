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
  /** Semaine en cours — mise en surbrillance (demande du 2026-08-01). */
  isCurrentWeek?: boolean;
};

// Seuils fixes, dernier repli seulement (demande du 2026-08-01 : les paliers
// doivent se baser sur la capacité réellement saisie, pas sur des heures
// arbitraires) — ne servent plus que tant qu'aucune capacité n'a jamais été
// saisie nulle part dans l'application (`averageCapacityMinutes` alors
// `null`, voir `getAverageWeeklyCapacityMinutes`). Repères pour une activité
// solo, à ajuster ici si le rythme réel diffère.
const BUSY_HOURS = 25;
const OVERLOAD_HOURS = 40;

// Priorité à la capacité réellement saisie **pour cette semaine précise**
// (`WorkCapacityDay`) ; à défaut, repli sur la **capacité hebdomadaire
// moyenne** dérivée de tout ce qui a déjà été saisi ailleurs (plus proche du
// rythme réel qu'un seuil arbitraire) ; seulement si rien n'a jamais été
// saisi nulle part, repli ultime sur les seuils fixes ci-dessus.
function loadStatus(
  entry: Pick<WeekEntry, "estimatedMinutes" | "capacityMinutes">,
  averageCapacityMinutes: number | null,
): ChartStatus {
  const capacityMinutes =
    entry.capacityMinutes !== undefined && entry.capacityMinutes > 0
      ? entry.capacityMinutes
      : averageCapacityMinutes;
  if (capacityMinutes !== null && capacityMinutes > 0) {
    const level = capacityAlertLevel(capacityMinutes, entry.estimatedMinutes);
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

export function WorkloadChart({
  data,
  averageCapacityMinutes,
}: {
  data: WeekEntry[];
  /** Capacité hebdomadaire moyenne dérivée de toute la capacité déjà saisie
   * (voir `getAverageWeeklyCapacityMinutes`), ou `null` si rien n'a jamais
   * été saisi — sert de repli quand une semaine précise n'a pas sa propre
   * capacité renseignée. */
  averageCapacityMinutes: number | null;
}) {
  // Plancher à 60 min pour que quelques semaines très légères ne produisent
  // pas des barres factices occupant toute la hauteur.
  const max = Math.max(60, ...data.map((entry) => Math.max(entry.estimatedMinutes, entry.capacityMinutes ?? 0)));
  const totalUnestimated = data.reduce((sum, entry) => sum + entry.unestimatedCount, 0);
  const hasCapacityData = data.some((entry) => entry.capacityMinutes !== undefined && entry.capacityMinutes > 0);
  const usingAverageFallback =
    averageCapacityMinutes !== null &&
    data.some((entry) => !(entry.capacityMinutes !== undefined && entry.capacityMinutes > 0));

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
      {averageCapacityMinutes === null ? (
        <p className="mb-3 text-xs text-ink-muted">
          Seuils {BUSY_HOURS} h / {OVERLOAD_HOURS} h utilisés en l&apos;absence de toute capacité
          saisie — paramétrez votre capacité pour des paliers basés sur votre rythme réel.
        </p>
      ) : (
        usingAverageFallback && (
          <p className="mb-3 text-xs text-ink-muted">
            Semaines sans capacité propre comparées à votre capacité hebdomadaire moyenne (
            {formatHoursFromMinutes(Math.round(averageCapacityMinutes))}), calculée sur tout ce que
            vous avez déjà saisi.
          </p>
        )
      )}

      {/* `pt-20 -mt-20` réserve la place de l'infobulle au-dessus des barres
          sans pousser le reste de la carte vers le bas : dès qu'un conteneur
          a `overflow-x: auto`, le navigateur force `overflow-y` à `auto`
          aussi (règle CSS standard, pas un choix ici) — une infobulle en
          position `absolute bottom-full` qui remonte au-dessus de ce
          conteneur se retrouvait donc rognée/invisible, sans indice qu'il
          fallait défiler pour la voir. Le padding agrandit la zone
          défilable pour l'y inclure ; la marge négative compense visuellement
          pour que la légende au-dessus ne s'éloigne pas des barres. */}
      <div className="-mt-20 flex items-end gap-3 overflow-x-auto pb-2 pt-20">
        {data.map((entry) => {
          const status = loadStatus(entry, averageCapacityMinutes);
          const hasCapacity = entry.capacityMinutes !== undefined && entry.capacityMinutes > 0;
          return (
            <div
              key={entry.key}
              // `px-1.5 py-2` uniforme sur toutes les colonnes (jamais
              // conditionnel) : voir le commentaire sur la bulle "+n"
              // plus bas — une marge qui ne s'appliquerait qu'à la semaine
              // en cours changerait sa hauteur totale et redécalerait sa
              // barre par rapport aux autres, avec `items-end`.
              className={`flex min-w-[52px] flex-col items-center gap-2 rounded-lg px-1.5 py-2 ${
                entry.isCurrentWeek ? "bg-accent/10 ring-1 ring-accent/40" : ""
              }`}
            >
              <span className="text-xs text-ink-muted">{formatHoursFromMinutes(entry.estimatedMinutes)}</span>
              <div
                tabIndex={0}
                aria-label={`${entry.label} : ${entry.taskCount} tâche${entry.taskCount > 1 ? "s" : ""}, ${formatHoursFromMinutes(entry.estimatedMinutes)} estimées${
                  hasCapacity
                    ? `, ${formatHoursFromMinutes(entry.capacityMinutes!)} de capacité saisie`
                    : averageCapacityMinutes !== null
                      ? `, ${formatHoursFromMinutes(Math.round(averageCapacityMinutes))} de capacité moyenne`
                      : ""
                }`}
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
                  {hasCapacity ? (
                    <p className="mt-0.5 text-ink-muted">
                      {formatHoursFromMinutes(entry.capacityMinutes!)} de capacité saisie
                    </p>
                  ) : (
                    averageCapacityMinutes !== null && (
                      <p className="mt-0.5 text-ink-muted">
                        {formatHoursFromMinutes(Math.round(averageCapacityMinutes))} de capacité
                        moyenne (aucune saisie cette semaine)
                      </p>
                    )
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
              <span className="whitespace-nowrap text-xs text-ink-muted">{entry.label}</span>
              {/* Une tâche sans estimation ne peut pas être convertie en hauteur
                  de barre sans inventer une durée : on la signale explicitement
                  plutôt que de la laisser peser zéro en silence. Sous le numéro
                  de semaine (demande du 2026-08-01), pas au-dessus.
                  Toujours rendue (juste rendue `invisible` si le compte est à
                  zéro) plutôt qu'omise : la ligne row utilise `items-end`, donc
                  une colonne sans bulle a une hauteur totale différente d'une
                  colonne avec bulle — ce qui décale les barres les unes par
                  rapport aux autres (bug réel trouvé le 2026-08-01, confirmé
                  en production). Réserver systématiquement la même hauteur
                  garde toutes les barres alignées, bulle affichée ou non. */}
              <span
                className={`rounded-full border border-line px-1.5 text-[10px] text-ink-muted ${
                  entry.unestimatedCount > 0 ? "" : "invisible"
                }`}
                title={
                  entry.unestimatedCount > 0
                    ? `${entry.unestimatedCount} tâche${entry.unestimatedCount > 1 ? "s" : ""} sans temps estimé — non comptée${entry.unestimatedCount > 1 ? "s" : ""} dans la hauteur de la barre`
                    : undefined
                }
                aria-hidden={entry.unestimatedCount > 0 ? undefined : true}
              >
                +{entry.unestimatedCount || 1}
              </span>
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
