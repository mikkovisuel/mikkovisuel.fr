import { parseParisDateTimeLocal, toParisDateTimeLocal } from "@/lib/social-posts";

// Moteur de cadences des routines (2026-09-25). Pas de garde `server-only` :
// les libellés et le calcul d'occurrences servent aussi à l'affichage.
//
// Tout est calculé sur le **calendrier de Paris**, jamais sur celui du
// serveur (UTC en production) : une routine "jeudi 18 h" doit rester à 18 h
// des deux côtés d'un changement d'heure, et une occurrence à 00 h 30 ne
// doit pas tomber la veille.

export const ROUTINE_CADENCES = [
  { slug: "weekly", label: "Chaque semaine" },
  { slug: "biweekly", label: "Une semaine sur deux" },
  { slug: "monthly_day", label: "Chaque mois, le N" },
  { slug: "monthly_weekday", label: "Chaque mois, le Nième jour" },
] as const;

export type RoutineCadence = (typeof ROUTINE_CADENCES)[number]["slug"];

export const MONTH_WEEKS = [
  { value: 1, label: "1er" },
  { value: 2, label: "2e" },
  { value: 3, label: "3e" },
  { value: 4, label: "4e" },
  { value: -1, label: "dernier" },
] as const;

export interface RoutineSchedule {
  cadence: string;
  /** Jours ISO : 1 = lundi ... 7 = dimanche. */
  weekdays: number[];
  biweeklyAnchor: Date | null;
  monthDay: number | null;
  /** 1 à 4, ou -1 pour "le dernier". */
  monthWeek: number | null;
  monthWeekday: number | null;
  /** "HH:mm", heure de Paris. */
  time: string;
  activeFrom: Date | null;
  activeUntil: Date | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Jour ISO (1 = lundi ... 7 = dimanche) d'une date lue en UTC. */
function isoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

/** Jour calendaire de Paris d'un instant, sous forme {year, month, day}. */
function parisDay(date: Date) {
  const iso = toParisDateTimeLocal(date).slice(0, 10);
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Le jour calendaire donné correspond-il à la cadence ? `day` est une date
 * UTC pure (minuit), utilisée comme simple repère de calendrier.
 */
function matchesCadence(schedule: RoutineSchedule, day: Date): boolean {
  const weekday = isoWeekday(day);
  switch (schedule.cadence) {
    case "weekly":
      return schedule.weekdays.includes(weekday);

    case "biweekly": {
      if (!schedule.weekdays.includes(weekday)) return false;
      // Une semaine sur deux, comptée depuis la semaine de référence : on
      // compare des **débuts de semaine** (lundi), pour que tous les jours
      // cochés d'une même semaine tombent ensemble.
      const anchor = schedule.biweeklyAnchor;
      if (!anchor) return true;
      const anchorDay = parisDay(anchor);
      const anchorUtc = Date.UTC(anchorDay.year, anchorDay.month - 1, anchorDay.day);
      const anchorMonday = anchorUtc - (isoWeekday(new Date(anchorUtc)) - 1) * 86400000;
      const dayMonday = day.getTime() - (weekday - 1) * 86400000;
      const weeks = Math.round((dayMonday - anchorMonday) / (7 * 86400000));
      return weeks % 2 === 0;
    }

    case "monthly_day": {
      if (!schedule.monthDay) return false;
      // Un "31" dans un mois de 30 jours tombe le dernier jour du mois
      // plutôt que d'être sauté — une routine mensuelle doit passer tous
      // les mois.
      const last = daysInMonth(day.getUTCFullYear(), day.getUTCMonth() + 1);
      return day.getUTCDate() === Math.min(schedule.monthDay, last);
    }

    case "monthly_weekday": {
      if (!schedule.monthWeekday || !schedule.monthWeek) return false;
      if (weekday !== schedule.monthWeekday) return false;
      if (schedule.monthWeek === -1) {
        // Dernier jour de ce type dans le mois : il n'y en a pas d'autre 7
        // jours plus tard.
        return day.getUTCDate() + 7 > daysInMonth(day.getUTCFullYear(), day.getUTCMonth() + 1);
      }
      return Math.ceil(day.getUTCDate() / 7) === schedule.monthWeek;
    }

    default:
      return false;
  }
}

/** Instant exact (UTC) d'une occurrence : le jour donné, à l'heure de Paris. */
function occurrenceAt(day: Date, time: string): Date | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  return parseParisDateTimeLocal(
    `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T${time}`,
  );
}

function withinValidity(schedule: RoutineSchedule, occurrence: Date): boolean {
  if (schedule.activeFrom && occurrence < schedule.activeFrom) return false;
  if (schedule.activeUntil && occurrence > schedule.activeUntil) return false;
  return true;
}

/**
 * Prochaine occurrence à partir de `from` inclus, ou `null` si la routine
 * n'en a plus (période de validité terminée, cadence incomplète). Cherche
 * jour par jour sur un an et demi au maximum : une cadence mensuelle ne
 * saute jamais plus de 31 jours, cette borne ne sert qu'à ne pas boucler
 * indéfiniment sur une cadence mal renseignée.
 */
export function nextRoutineOccurrence(schedule: RoutineSchedule, from: Date): Date | null {
  const start = parisDay(from);
  for (let offset = 0; offset <= 550; offset++) {
    const day = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    if (schedule.activeUntil && day.getTime() - 86400000 > schedule.activeUntil.getTime()) return null;
    if (!matchesCadence(schedule, day)) continue;
    const occurrence = occurrenceAt(day, schedule.time);
    if (!occurrence || occurrence < from) continue;
    if (!withinValidity(schedule, occurrence)) continue;
    return occurrence;
  }
  return null;
}

/**
 * Occurrences d'un mois calendaire (`month` indexé à partir de 0), à partir
 * de `from` inclus — utilisé par les cases "à préparer" du calendrier.
 */
export function routineOccurrencesInMonth(
  schedule: RoutineSchedule,
  year: number,
  month: number,
  from: Date,
): Date[] {
  const result: Date[] = [];
  const total = daysInMonth(year, month + 1);
  for (let dayNumber = 1; dayNumber <= total; dayNumber++) {
    const day = new Date(Date.UTC(year, month, dayNumber));
    if (!matchesCadence(schedule, day)) continue;
    const occurrence = occurrenceAt(day, schedule.time);
    if (!occurrence || occurrence < from) continue;
    if (!withinValidity(schedule, occurrence)) continue;
    result.push(occurrence);
  }
  return result;
}

const WEEKDAY_SHORT = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

/** Résumé lisible d'une cadence : "Chaque lundi et jeudi à 18 h". */
export function describeCadence(schedule: RoutineSchedule): string {
  const time = schedule.time.endsWith(":00")
    ? `${Number(schedule.time.slice(0, 2))} h`
    : `${Number(schedule.time.slice(0, 2))} h ${schedule.time.slice(3)}`;
  const days = schedule.weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((weekday) => WEEKDAY_SHORT[weekday - 1] ?? "")
    .filter(Boolean);
  const dayList = days.length > 1 ? `${days.slice(0, -1).join(", ")} et ${days[days.length - 1]}` : days[0] ?? "—";

  switch (schedule.cadence) {
    case "weekly":
      return `Chaque ${dayList} à ${time}`;
    case "biweekly":
      return `Une semaine sur deux, ${dayList} à ${time}`;
    case "monthly_day":
      return `Le ${schedule.monthDay ?? "?"} de chaque mois à ${time}`;
    case "monthly_weekday": {
      const week = MONTH_WEEKS.find((item) => item.value === schedule.monthWeek)?.label ?? "?";
      const weekday = WEEKDAY_SHORT[(schedule.monthWeekday ?? 1) - 1] ?? "?";
      return `Le ${week} ${weekday} du mois à ${time}`;
    }
    default:
      return "Cadence à compléter";
  }
}
