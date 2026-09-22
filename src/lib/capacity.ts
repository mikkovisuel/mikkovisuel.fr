import "server-only";
import { db } from "@/lib/db";
import { ACTIVE_TASKS } from "@/lib/tasks";
import { TASK_STATUS } from "@/lib/dropdown-lists";

// Moteur de capacité (ajouté le 2026-07-31) : compare la charge déjà promise
// (somme des `estimatedMinutes` des tâches actives dont l'échéance tombe
// dans une période) à la capacité réellement saisie pour cette période
// (`WorkCapacityDay`, une ligne par jour). Utilisé par la pop-up de
// paramétrage, la page Planning, et l'alerte à la saisie d'une échéance.

// Minuit UTC pour une date calendaire — même convention que
// `WorkCapacityDay.date` (voir le schéma) : une capacité se raisonne par
// jour entier, jamais par instant, donc pas de fuseau à gérer au-delà de
// choisir une convention fixe et s'y tenir.
export function toCalendarDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Capacité totale saisie sur la période [since, until] inclus. Les jours
// sans ligne `WorkCapacityDay` ne contribuent rien — une capacité non
// saisie n'est pas "0 h de dispo", mais on ne peut pas non plus supposer
// une capacité par défaut sans fausser le calcul : le compromis retenu est
// de compter 0 pour un jour inconnu (prudent : ne jamais promettre plus que
// ce qui est explicitement saisi), documenté au niveau de l'appelant plutôt
// que cette fonction, qui reste une simple somme.
export async function getCapacityMinutes(since: Date, until: Date): Promise<number> {
  const rows = await db.workCapacityDay.findMany({
    where: { date: { gte: toCalendarDate(since), lte: toCalendarDate(until) } },
    select: { availableMinutes: true },
  });
  return rows.reduce((sum, row) => sum + row.availableMinutes, 0);
}

// Nombre de jours de la période pour lesquels une capacité a été saisie —
// sert à distinguer "0 h de capacité saisie sur toute la période" (donnée
// manquante, pas de conclusion à en tirer) de "capacité saisie et
// effectivement nulle" (jours fériés/week-end volontairement mis à 0).
async function getCapacityCoverageDays(since: Date, until: Date): Promise<number> {
  return db.workCapacityDay.count({
    where: { date: { gte: toCalendarDate(since), lte: toCalendarDate(until) } },
  });
}

// Capacité hebdomadaire moyenne, dérivée de TOUS les jours déjà saisis (pas
// seulement ceux de la semaine affichée) — demande du 2026-08-01 : sert de
// repli pour une semaine sans capacité propre, à la place des seuils fixes
// (25 h / 40 h), pour rester basé sur le rythme réel de l'utilisateur plutôt
// que sur une estimation arbitraire. `null` seulement si rien n'a jamais été
// saisi nulle part (repli ultime sur les seuils fixes dans ce cas précis).
// Moyenne par jour puis ×7 plutôt qu'un simple regroupement par semaine :
// les jours à 0 h saisis volontairement (week-ends, fériés) pèsent déjà dans
// la moyenne journalière, donc le ×7 restitue une vraie moyenne hebdomadaire
// sans avoir à deviner quels jours sont "ouvrés".
export async function getAverageWeeklyCapacityMinutes(): Promise<number | null> {
  const result = await db.workCapacityDay.aggregate({
    _sum: { availableMinutes: true },
    _count: true,
  });
  if (result._count === 0) return null;
  return ((result._sum.availableMinutes ?? 0) / result._count) * 7;
}

// Charge déjà promise sur la période : somme des temps estimés des tâches
// actives (hors démo/archivées/Terminé) dont l'échéance de livraison tombe
// dans l'intervalle. `excludeTaskId` sert à l'alerte de saisie d'échéance
// (une tâche ne doit pas se compter deux fois quand on modifie sa propre
// date).
async function getCommittedMinutes(
  since: Date,
  until: Date,
  excludeTaskId?: string,
): Promise<number> {
  const rows = await db.task.findMany({
    where: {
      ...ACTIVE_TASKS,
      status: { slug: { not: TASK_STATUS.TERMINE } },
      dueDate: { gte: toCalendarDate(since), lte: toCalendarDate(until) },
      ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
    },
    select: { estimatedMinutes: true },
  });
  return rows.reduce((sum, row) => sum + (row.estimatedMinutes ?? 0), 0);
}

export type CapacityAlertLevel = "ok" | "warning" | "overload" | "unknown";

// Seuil à 20% (demande explicite) : "orange lorsque ça rentre à + ou - 20%
// de la charge restante, rouge avec surcharge". Lu comme : la marge restante
// (capacité moins déjà promis) tombe sous 20% de la capacité totale ->
// avertissement ; la marge est négative -> surcharge.
const WARNING_MARGIN_RATIO = 0.2;

export function capacityAlertLevel(
  capacityMinutes: number,
  committedMinutes: number,
): CapacityAlertLevel {
  if (capacityMinutes <= 0) return "unknown";
  const remaining = capacityMinutes - committedMinutes;
  if (remaining < 0) return "overload";
  if (remaining < capacityMinutes * WARNING_MARGIN_RATIO) return "warning";
  return "ok";
}

export interface DueDateCapacityCheck {
  level: CapacityAlertLevel;
  capacityMinutes: number;
  committedMinutes: number;
  remainingMinutes: number;
  coverageDays: number;
  totalDays: number;
}

// Vérification complète pour une échéance candidate — utilisée par le
// formulaire de tâche (TaskEditForm) à chaque changement de date. La
// période considérée va d'aujourd'hui à la date choisie inclus : c'est tout
// le travail qu'il reste à absorber avant cette échéance.
export async function checkDueDateCapacity(
  dueDate: Date,
  excludeTaskId?: string,
): Promise<DueDateCapacityCheck> {
  const since = toCalendarDate(new Date());
  const until = toCalendarDate(dueDate);
  const totalDays = Math.max(1, Math.round((until.getTime() - since.getTime()) / 86_400_000) + 1);

  const [capacityMinutes, committedMinutes, coverageDays] = await Promise.all([
    getCapacityMinutes(since, until),
    getCommittedMinutes(since, until, excludeTaskId),
    getCapacityCoverageDays(since, until),
  ]);

  return {
    level: capacityAlertLevel(capacityMinutes, committedMinutes),
    capacityMinutes,
    committedMinutes,
    remainingMinutes: capacityMinutes - committedMinutes,
    coverageDays,
    totalDays,
  };
}

// Les 7 jours d'une semaine calendaire (lundi -> dimanche) contenant `date` —
// utilisé par la pop-up de saisie, qui affiche toujours une semaine entière.
export function weekDays(date: Date): Date[] {
  const base = toCalendarDate(date);
  const dayOfWeek = base.getUTCDay();
  // `getUTCDay()` : 0 = dimanche. Décalage pour que le lundi soit le premier
  // jour, convention française habituelle pour une semaine de travail.
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addDays(base, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export interface CapacityWeekData {
  weekStart: string;
  label: string;
  days: { date: string; dayLabel: string; hours: number | null }[];
}

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateFr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
}

// Fenêtre de semaines pré-chargée pour la pop-up de saisie (`CapacityPopup`) :
// une seule requête couvrant plusieurs mois, plutôt qu'un aller-retour serveur
// à chaque navigation entre semaines dans la modale.
export async function getCapacityWeeksWindow(
  weeksBefore: number,
  weeksAfter: number,
): Promise<CapacityWeekData[]> {
  const [thisMonday] = weekDays(new Date());
  const firstMonday = addDays(thisMonday, -7 * weeksBefore);
  const totalWeeks = weeksBefore + weeksAfter + 1;
  const lastSunday = addDays(firstMonday, totalWeeks * 7 - 1);

  const rows = await db.workCapacityDay.findMany({
    where: { date: { gte: firstMonday, lte: lastSunday } },
  });
  const hoursByDate = new Map(rows.map((row) => [toIsoDate(row.date), row.availableMinutes / 60]));

  return Array.from({ length: totalWeeks }, (_, weekIndex) => {
    const monday = addDays(firstMonday, weekIndex * 7);
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(monday, dayIndex);
      const iso = toIsoDate(date);
      return {
        date: iso,
        dayLabel: `${DAY_LABELS[dayIndex]} ${formatDateFr(date)}`,
        hours: hoursByDate.get(iso) ?? null,
      };
    });
    return { weekStart: toIsoDate(monday), label: `Semaine du ${formatDateFr(monday)}`, days };
  });
}
