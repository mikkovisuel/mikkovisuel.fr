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

function loadColor(hours: number): "green" | "orange" | "red" {
  if (hours >= OVERLOAD_HOURS) return "red";
  if (hours >= BUSY_HOURS) return "orange";
  return "green";
}

const BAR_CLASSES = {
  green: "bg-emerald-500",
  orange: "bg-amber-500",
  red: "bg-danger",
};

function formatHours(minutes: number) {
  if (minutes === 0) return "0 h";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

export function WorkloadChart({ data }: { data: WeekEntry[] }) {
  // Plancher à 60 min pour que quelques semaines très légères ne produisent
  // pas des barres factices occupant toute la hauteur.
  const max = Math.max(60, ...data.map((entry) => entry.estimatedMinutes));
  const totalUnestimated = data.reduce((sum, entry) => sum + entry.unestimatedCount, 0);

  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Charge normale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          Chargée ({BUSY_HOURS} h+)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-danger" />
          Surcharge ({OVERLOAD_HOURS} h+)
        </span>
      </div>

      <div className="flex items-end gap-3 overflow-x-auto pb-2">
        {data.map((entry) => (
          <div key={entry.key} className="flex min-w-[52px] flex-col items-center gap-2">
            <span className="text-xs text-ink-muted">{formatHours(entry.estimatedMinutes)}</span>
            <div
              className="flex h-40 w-7 items-end overflow-hidden rounded-t-md bg-surface-elevated"
              title={`${entry.taskCount} tâche${entry.taskCount > 1 ? "s" : ""} · ${formatHours(entry.estimatedMinutes)} estimées`}
            >
              <div
                className={`w-full rounded-t-md ${BAR_CLASSES[loadColor(entry.estimatedMinutes / 60)]}`}
                style={{ height: `${(entry.estimatedMinutes / max) * 100}%` }}
              />
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
        ))}
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
