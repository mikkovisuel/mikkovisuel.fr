import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ACTIVE_TASKS, isoWeekNumber } from "@/lib/tasks";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { WorkloadChart } from "@/components/admin/workload-chart";
import { TrendChart } from "@/components/admin/trend-chart";
import { CapacityPopup } from "@/components/admin/capacity-popup";
import { STATUS_VARS } from "@/components/admin/chart-status";
import { formatHoursFromMinutes, sumTaskTimeMs } from "@/lib/time-tracking";
import {
  checkDueDateCapacity,
  getCapacityMinutes,
  getCapacityWeeksWindow,
  toCalendarDate,
  weekDays,
} from "@/lib/capacity";

export const metadata: Metadata = {
  title: "Planning de charge — Admin Mikko Visuel",
};

// Base de calcul de la charge (demande du 2026-08-01) : "évènement" regarde
// quand le travail est concrètement prévu (`Task.eventDate`, la date à
// laquelle la prestation a lieu) ; "échéance" regarde quand elle doit être
// livrée (`Task.dueDate`, déjà la base de l'alerte de capacité sur la fiche
// tâche). Les deux mesurent la même charge, juste rattachée à une date
// différente — utile par exemple pour un aftermovie livré bien après
// l'évènement filmé.
type PlanningBasis = "evenement" | "echeance";

function weekKey(date: Date) {
  return `${date.getFullYear()}-S${String(isoWeekNumber(date)).padStart(2, "0")}`;
}

function weekLabel(date: Date) {
  return `S${isoWeekNumber(date)}`;
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ base?: string }>;
}) {
  await verifyAdminSession();
  const { base } = await searchParams;
  const basis: PlanningBasis = base === "echeance" ? "echeance" : "evenement";
  const dateField = basis === "echeance" ? "dueDate" : "eventDate";

  const [tasks, unallocatedTasks, capacityWeeks] = await Promise.all([
    db.task.findMany({
      where: { ...ACTIVE_TASKS, [dateField]: { not: null } },
      select: { id: true, eventDate: true, dueDate: true, estimatedMinutes: true },
      orderBy: { [dateField]: "asc" },
    }),
    // "Charge non répartie" (demande du 2026-07-31, précisée le 2026-08-01) :
    // tâches actives sans date sur la base choisie, donc absentes du
    // graphique hebdomadaire — un travail déjà promis mais pas encore placé
    // dans le temps sur cette base précise.
    db.task.findMany({
      where: { ...ACTIVE_TASKS, [dateField]: null, status: { slug: { not: TASK_STATUS.TERMINE } } },
      select: { id: true, title: true, estimatedMinutes: true, eventDate: true, dueDate: true },
      orderBy: { createdAt: "desc" },
    }),
    getCapacityWeeksWindow(2, 12),
  ]);

  // Charge pondérée par le temps estimé plutôt que par le nombre de tâches
  // (2026-07-30) : les tâches sans estimation sont comptées à part au lieu
  // d'être noyées à zéro, pour que leur absence se voie.
  const byWeek = new Map<
    string,
    { label: string; estimatedMinutes: number; taskCount: number; unestimatedCount: number; sampleDate: Date }
  >();
  for (const task of tasks) {
    const date = (basis === "echeance" ? task.dueDate : task.eventDate)!;
    const key = weekKey(date);
    const entry =
      byWeek.get(key) ??
      { label: weekLabel(date), estimatedMinutes: 0, taskCount: 0, unestimatedCount: 0, sampleDate: date };
    entry.taskCount += 1;
    if (task.estimatedMinutes && task.estimatedMinutes > 0) {
      entry.estimatedMinutes += task.estimatedMinutes;
    } else {
      entry.unestimatedCount += 1;
    }
    byWeek.set(key, entry);
  }

  const weekEntries = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-16);

  // Fenêtre de dates couverte par les semaines affichées, pour une seule
  // requête de temps chronométré plutôt qu'une par semaine.
  const weekRanges = weekEntries.map(([, value]) => weekDays(value.sampleDate));
  const rangeStart = weekRanges.length
    ? weekRanges.reduce((min, days) => (days[0] < min ? days[0] : min), weekRanges[0][0])
    : null;
  const rangeEnd = weekRanges.length
    ? weekRanges.reduce((max, days) => (days[6] > max ? days[6] : max), weekRanges[0][6])
    : null;

  // Capacité réelle par semaine affichée, en complément du graphique existant
  // (repli sur les seuils fixes dans `WorkloadChart` si aucune capacité n'a
  // été saisie pour cette semaine-là) ; temps réellement travaillé (demande
  // du 2026-08-01), pour la tendance prévu/réel — rattaché à la semaine où
  // la session a *commencé*, même convention que le rapport Temps &
  // rentabilité, indépendant de la base évènement/échéance choisie
  // ci-dessus puisqu'il s'agit de travail effectivement réalisé.
  const timeEntries = rangeStart
    ? await db.taskTimeEntry.findMany({
        where: { task: { ...ACTIVE_TASKS }, startedAt: { gte: rangeStart, lt: new Date(rangeEnd!.getTime() + 86_400_000) } },
        select: { startedAt: true, endedAt: true },
      })
    : [];
  const now = new Date();
  const realMinutesByWeek = new Map<string, number>();
  for (const entry of timeEntries) {
    const key = weekKey(entry.startedAt);
    const ms = sumTaskTimeMs([entry], now);
    realMinutesByWeek.set(key, (realMinutesByWeek.get(key) ?? 0) + ms / 60_000);
  }

  const weekData = await Promise.all(
    weekEntries.map(async ([key, value]) => {
      const [monday, , , , , , sunday] = weekDays(value.sampleDate);
      const capacityMinutes = await getCapacityMinutes(monday, sunday);
      const realMinutes = Math.round(realMinutesByWeek.get(key) ?? 0);
      return {
        key,
        label: value.label,
        estimatedMinutes: value.estimatedMinutes,
        taskCount: value.taskCount,
        unestimatedCount: value.unestimatedCount,
        capacityMinutes,
        realMinutes,
      };
    }),
  );

  const unallocatedMinutes = unallocatedTasks.reduce(
    (sum, task) => sum + (task.estimatedMinutes ?? 0),
    0,
  );
  const unallocatedUnestimated = unallocatedTasks.filter((task) => !task.estimatedMinutes).length;

  const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

  // Tableau de bord (demande du 2026-08-01) : quatre indicateurs choisis par
  // le client parmi les suggestions proposées, pour une vision globale sans
  // avoir à déplier chaque section plus bas.
  const today = toCalendarDate(new Date());
  const overdueCount = await db.task.count({
    where: { ...ACTIVE_TASKS, status: { slug: { not: TASK_STATUS.TERMINE } }, dueDate: { lt: today } },
  });

  // "À risque" : tâches à échéance proche dont la marge de capacité
  // restante est déjà en alerte (même calcul que sur la fiche tâche,
  // `checkDueDateCapacity`) — pas un nouveau seuil inventé pour le tableau
  // de bord.
  const RISK_HORIZON_DAYS = 30;
  const horizonUntil = new Date(today.getTime() + RISK_HORIZON_DAYS * 86_400_000);
  const horizonTasks = await db.task.findMany({
    where: {
      ...ACTIVE_TASKS,
      status: { slug: { not: TASK_STATUS.TERMINE } },
      dueDate: { gte: today, lte: horizonUntil },
    },
    select: { id: true, dueDate: true },
  });
  const riskChecks = await Promise.all(
    horizonTasks.map((task) => checkDueDateCapacity(task.dueDate!, task.id)),
  );
  const atRiskCount = riskChecks.filter((check) => check.level === "warning" || check.level === "overload").length;

  // Écart moyen sur les 4 dernières semaines *complètes* : la semaine en
  // cours est exclue, son temps réel étant mécaniquement incomplet tant
  // qu'elle n'est pas terminée (comparer un réel partiel à un prévu entier
  // afficherait un écart négatif systématique et trompeur).
  const currentWeekKey = weekKey(today);
  const completedWeeks = weekData.filter((entry) => entry.key !== currentWeekKey);
  const last4Weeks = completedWeeks.slice(-4);
  const avgDeltaMinutes =
    last4Weeks.length > 0
      ? Math.round(
          last4Weeks.reduce((sum, entry) => sum + (entry.realMinutes - entry.estimatedMinutes), 0) /
            last4Weeks.length,
        )
      : null;

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8" style={STATUS_VARS}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Planning de charge</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            {basis === "echeance"
              ? "Temps de travail estimé par semaine, selon la date de livraison des tâches — pour repérer une surcharge à l'avance."
              : "Temps de travail estimé par semaine, selon la date d'évènement des tâches — pour repérer une surcharge à l'avance."}{" "}
            Client de démonstration exclu, tâches archivées non comptées.
          </p>
        </div>
        <CapacityPopup weeks={capacityWeeks} />
      </div>

      {/* Tableau de bord (demande du 2026-08-01) : 4 indicateurs choisis par
          le client parmi les suggestions proposées, pour une vision globale
          sans déplier chaque section plus bas. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-ink-muted">Tâches en retard</p>
          <p className={`mt-1 text-2xl font-medium ${overdueCount > 0 ? "text-(--status-critical)" : "text-ink"}`}>
            {overdueCount}
          </p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-ink-muted">À risque (30 j)</p>
          <p className={`mt-1 text-2xl font-medium ${atRiskCount > 0 ? "text-(--status-warning)" : "text-ink"}`}>
            {atRiskCount}
          </p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-ink-muted">Écart moyen (4 sem.)</p>
          <p className="mt-1 text-2xl font-medium text-ink">
            {avgDeltaMinutes === null ? (
              "—"
            ) : (
              <span className={avgDeltaMinutes < 0 ? "text-(--status-critical)" : "text-(--status-good)"}>
                {avgDeltaMinutes > 0 ? "+" : avgDeltaMinutes < 0 ? "−" : ""}
                {formatHoursFromMinutes(Math.abs(avgDeltaMinutes))}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-xs text-ink-muted">Charge non répartie</p>
          <p className="mt-1 text-2xl font-medium text-ink">{formatHoursFromMinutes(unallocatedMinutes)}</p>
        </div>
      </div>

      {/* Bascule de la base de calcul (demande du 2026-08-01) : même moteur,
          juste rattaché à une date différente — voir le commentaire sur
          `PlanningBasis` plus haut. */}
      <div className="mt-4 inline-flex rounded-full border border-line p-1 text-sm">
        <Link
          href="/admin/planning"
          className={`rounded-full px-3 py-1.5 transition-colors ${
            basis === "evenement" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
          }`}
        >
          Par date d&apos;évènement
        </Link>
        <Link
          href="/admin/planning?base=echeance"
          className={`rounded-full px-3 py-1.5 transition-colors ${
            basis === "echeance" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
          }`}
        >
          Par échéance
        </Link>
      </div>

      {weekData.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">
          {basis === "echeance" ? "Aucune tâche avec une échéance." : "Aucune tâche avec une date d'évènement."}
        </p>
      ) : (
        <>
          <div className="mt-8">
            <WorkloadChart data={weekData} />
          </div>

          {/* Tendance prévu/réel (demande du 2026-08-01) : le "réel" vient du
              temps chronométré, indépendant de la base évènement/échéance
              choisie ci-dessus — voir le commentaire dans TrendChart. */}
          <div className="mt-6">
            <h2 className="mb-3 font-display text-lg font-medium tracking-tight text-ink">
              Tendance : prévu vs réel
            </h2>
            <TrendChart data={weekData} />
          </div>
        </>
      )}

      <section className="mt-10 rounded-2xl border border-line p-5">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">
          Charge non répartie
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {basis === "echeance"
            ? "Tâches actives sans échéance — donc absentes du graphique ci-dessus."
            : "Tâches actives sans date d'évènement — donc absentes du graphique ci-dessus."}
        </p>

        {unallocatedTasks.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Aucune tâche non planifiée.</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-ink">
              {unallocatedTasks.length} tâche{unallocatedTasks.length > 1 ? "s" : ""} ·{" "}
              {formatHoursFromMinutes(unallocatedMinutes)} estimées
              {unallocatedUnestimated > 0 &&
                ` (+${unallocatedUnestimated} sans estimation)`}
            </p>
            <ul className="mt-3 divide-y divide-line">
              {unallocatedTasks.map((task) => {
                const otherDate = basis === "echeance" ? task.eventDate : task.dueDate;
                return (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-ink">{task.title}</span>
                    <span className="whitespace-nowrap text-ink-muted">
                      {task.estimatedMinutes ? formatHoursFromMinutes(task.estimatedMinutes) : "non estimée"}
                      {otherDate &&
                        ` · ${basis === "echeance" ? "évènement" : "échéance"} ${dateFormatter.format(otherDate)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
