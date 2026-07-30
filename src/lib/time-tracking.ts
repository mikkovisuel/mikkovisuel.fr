// Suivi du temps passé sur une tâche — voir `TaskTimeEntry` dans le schéma.
// Jamais importé depuis les pages `/espace-client/*` : c'est ce qui garde
// cette fonctionnalité invisible côté client, pas un flag séparé.

export interface TimeEntryLike {
  startedAt: Date;
  endedAt: Date | null;
}

// Somme des sessions, session en cours comprise (comptée jusqu'à `now`).
export function sumTaskTimeMs(entries: TimeEntryLike[], now: Date = new Date()): number {
  return entries.reduce(
    (total, entry) => total + ((entry.endedAt ?? now).getTime() - entry.startedAt.getTime()),
    0,
  );
}

// "2h 15" / "45 min" / "3h" — compact, pour les colonnes de tableau et la
// jauge. Arrondi à la minute la plus proche (la précision à la seconde
// n'a pas d'intérêt une fois agrégée).
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}`;
}

// "2 h 15" / "45 min" — format long, pour les tableaux et graphiques agrégés
// (rapport de rentabilité, planning de charge), là où `formatDurationShort`
// reste réservé aux colonnes compactes.
export function formatHoursFromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, "0")}`;
}

// "1:23:07" — pour le chronomètre en direct (header, bouton démarrer/
// arrêter), qui a besoin des secondes pour donner l'impression de tourner.
export function formatElapsedClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

export type TimeGaugeColor = "green" | "orange" | "red";

// Vert dans les temps (< 80 % de l'estimation) / orange à partir de 80 % /
// rouge au-delà de 100 %.
export function timeGaugeColor(spentMinutes: number, estimatedMinutes: number): TimeGaugeColor {
  if (estimatedMinutes <= 0) return "green";
  const ratio = spentMinutes / estimatedMinutes;
  if (ratio > 1) return "red";
  if (ratio >= 0.8) return "orange";
  return "green";
}

export const TIME_GAUGE_BAR_CLASSES: Record<TimeGaugeColor, string> = {
  green: "bg-emerald-500",
  orange: "bg-amber-500",
  red: "bg-danger",
};

export const TIME_GAUGE_TEXT_CLASSES: Record<TimeGaugeColor, string> = {
  green: "text-emerald-700 dark:text-emerald-300",
  orange: "text-amber-700 dark:text-amber-300",
  red: "text-danger",
};
