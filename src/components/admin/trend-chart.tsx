import { formatHoursFromMinutes } from "@/lib/time-tracking";

type TrendEntry = {
  key: string;
  label: string;
  /** Charge prévue (`estimatedMinutes` des tâches de la semaine). */
  estimatedMinutes: number;
  /** Temps réellement travaillé sur la semaine, chronométré (`TaskTimeEntry`). */
  realMinutes: number;
  /** Semaine en cours — mise en surbrillance (demande du 2026-08-01). */
  isCurrentWeek?: boolean;
};

// Deux couleurs catégorielles (identité de série), jamais les couleurs de
// statut (good/warning/critical) déjà réservées ailleurs dans le Planning —
// slots 1 et 2 de la palette catégorielle validée par le skill dataviz
// (palette.md), le seul couple garanti distinguable en clair et en sombre.
const SERIES_VARS = {
  "--series-prevu": "#2a78d6",
  "--series-reel": "#eb6834",
} as React.CSSProperties;

// Le delta réutilise les couleurs de statut (bonne/critique), pas les
// couleurs de série ci-dessus : c'est un jugement de charge, pas une
// troisième série de données. Vert quand le réel est en dessous du prévu
// (marge, pas de surcharge), rouge dans le cas inverse (demande du
// 2026-08-01) — un réel plus élevé que prévu est le signal à surveiller,
// pas l'inverse.
function deltaClass(deltaMinutes: number): string {
  if (deltaMinutes > 0) return "text-(--status-critical)";
  return "text-(--status-good)";
}

function formatDelta(deltaMinutes: number): string {
  const sign = deltaMinutes > 0 ? "+" : deltaMinutes < 0 ? "−" : "";
  return `${sign}${formatHoursFromMinutes(Math.abs(deltaMinutes))}`;
}

// Tendance semaine par semaine, prévu vs réel (demande du 2026-08-01) : le
// "réel" vient du temps chronométré (`TaskTimeEntry`), rattaché à la semaine
// où la session a *commencé* (même convention que le rapport Temps &
// rentabilité) — indépendant de la base évènement/échéance choisie pour le
// graphique de charge au-dessus, puisqu'il s'agit de travail effectivement
// réalisé, pas d'un engagement rattaché à une date de tâche.
export function TrendChart({ data }: { data: TrendEntry[] }) {
  const max = Math.max(60, ...data.flatMap((entry) => [entry.estimatedMinutes, entry.realMinutes]));

  return (
    <div className="rounded-2xl border border-line p-5" style={SERIES_VARS}>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-(--series-prevu)" />
          Prévu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-(--series-reel)" />
          Réel (temps chronométré)
        </span>
      </div>

      {/* `pt-24 -mt-24` réserve la place de l'infobulle (4 lignes ici, un peu
          plus haute que celle du graphique de charge) sans pousser la carte
          vers le bas — voir le commentaire équivalent dans WorkloadChart
          pour la raison (overflow-x auto force overflow-y auto, qui rognait
          l'infobulle sans ça). */}
      <div className="-mt-24 flex items-end gap-4 overflow-x-auto pb-2 pt-24">
        {data.map((entry) => {
          const delta = entry.realMinutes - entry.estimatedMinutes;
          return (
            <div
              key={entry.key}
              // `px-1.5 py-2` appliqué à TOUTES les colonnes (pas seulement
              // celle en cours) : une marge conditionnelle changerait la
              // hauteur totale d'une seule colonne et redécalerait les
              // barres, exactement le défaut corrigé plus haut avec la
              // bulle "+n". Seuls le fond et l'anneau varient.
              className={`flex min-w-[64px] flex-col items-center gap-2 rounded-lg px-1.5 py-2 ${
                entry.isCurrentWeek ? "bg-accent/10 ring-1 ring-accent/40" : ""
              }`}
            >
              <span className={`text-xs font-medium ${deltaClass(delta)}`}>{formatDelta(delta)}</span>
              <div
                tabIndex={0}
                aria-label={`${entry.label} : ${formatHoursFromMinutes(entry.estimatedMinutes)} prévues, ${formatHoursFromMinutes(entry.realMinutes)} réellement travaillées, écart ${formatDelta(delta)}`}
                className="group relative flex h-36 items-end gap-1 focus:outline-none"
              >
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[14rem] -translate-x-1/2 rounded-lg border border-line bg-surface-elevated px-3 py-2 text-xs text-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  <p className="font-medium">{entry.label}</p>
                  <p className="mt-0.5 text-ink-muted">Prévu : {formatHoursFromMinutes(entry.estimatedMinutes)}</p>
                  <p className="text-ink-muted">Réel : {formatHoursFromMinutes(entry.realMinutes)}</p>
                  <p className={`mt-0.5 font-medium ${deltaClass(delta)}`}>Écart : {formatDelta(delta)}</p>
                </div>
                <div
                  className="w-4 rounded-t bg-(--series-prevu)"
                  style={{ height: `${(entry.estimatedMinutes / max) * 100}%` }}
                />
                <div
                  className="w-4 rounded-t bg-(--series-reel)"
                  style={{ height: `${(entry.realMinutes / max) * 100}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-xs text-ink-muted">{entry.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
