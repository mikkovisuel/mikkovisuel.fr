import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ACTIVE_TASKS, isoWeekNumber } from "@/lib/tasks";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { WorkloadChart } from "@/components/admin/workload-chart";
import { TrendChart } from "@/components/admin/trend-chart";
import { DailyChart, type DailyEntry } from "@/components/admin/daily-chart";
import { CapacityPopup } from "@/components/admin/capacity-popup";
import { STATUS_VARS } from "@/components/admin/chart-status";
import { formatHoursFromMinutes, sumTaskTimeMs } from "@/lib/time-tracking";
import {
  checkDueDateCapacity,
  getAverageWeeklyCapacityMinutes,
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

function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * 7 * 86_400_000);
}

// Taille de la fenêtre de semaines affichée dans les graphiques, et choix des
// semaines à l'intérieur (demande du 2026-08-01, "avoir le choix des
// semaines dans les affichages") : navigation précédent/suivant par bloc de
// 16 semaines entières, via `?semaine=N` (N = nombre de blocs en arrière).
// Par défaut (N=0), la fenêtre se termine 4 semaines après la semaine en
// cours plutôt que pile sur aujourd'hui — une tâche déjà planifiée dans les
// prochaines semaines doit rester visible sans naviguer.
const WINDOW_SIZE = 16;
const FUTURE_WEEKS_DEFAULT = 4;

// Vue jour (demande du 2026-08-01, "vue par jours en sélectionnant la
// semaine") : une semaine à la fois, navigable indépendamment de la fenêtre
// de 16 semaines de la vue semaine — voir `DailyChart`.
type PlanningView = "semaine" | "jour";

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ base?: string; semaine?: string; vue?: string; semaineJour?: string }>;
}) {
  await verifyAdminSession();
  const { base, semaine, vue, semaineJour } = await searchParams;
  const view: PlanningView = vue === "jour" ? "jour" : "semaine";
  // Échéance par défaut (demande du 2026-08-01) : ce qu'il faut surveiller en
  // priorité, c'est quand une tâche doit être livrée, pas seulement quand
  // elle a lieu — "évènement" reste disponible via `?base=evenement`.
  const basis: PlanningBasis = base === "evenement" ? "evenement" : "echeance";
  const dateField = basis === "echeance" ? "dueDate" : "eventDate";

  const parsedOffset = Number.parseInt(semaine ?? "0", 10);
  const weekOffset = Number.isFinite(parsedOffset) ? parsedOffset : 0;
  const [thisMonday] = weekDays(new Date());
  const currentWeekKey = weekKey(thisMonday);
  const defaultWindowEnd = addWeeks(thisMonday, FUTURE_WEEKS_DEFAULT);
  const defaultWindowStart = addWeeks(defaultWindowEnd, -(WINDOW_SIZE - 1));
  const windowStart = addWeeks(defaultWindowStart, -weekOffset * WINDOW_SIZE);
  const windowMondays = Array.from({ length: WINDOW_SIZE }, (_, i) => addWeeks(windowStart, i));

  const parsedDayOffset = Number.parseInt(semaineJour ?? "0", 10);
  const dayWeekOffset = Number.isFinite(parsedDayOffset) ? parsedDayOffset : 0;
  const selectedDayWeekMonday = addWeeks(thisMonday, dayWeekOffset);
  const selectedDayWeekSunday = addWeeks(selectedDayWeekMonday, 1);

  const [tasks, unallocatedTasks, capacityWeeks, averageCapacityMinutes, dayTasks, dayCapacities] = await Promise.all([
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
    getAverageWeeklyCapacityMinutes(),
    // Vue jour : uniquement les tâches de la semaine sélectionnée, sur la
    // même base évènement/échéance que la vue semaine.
    db.task.findMany({
      where: { ...ACTIVE_TASKS, [dateField]: { gte: selectedDayWeekMonday, lt: selectedDayWeekSunday } },
      select: { eventDate: true, dueDate: true, estimatedMinutes: true },
    }),
    db.workCapacityDay.findMany({
      where: { date: { gte: selectedDayWeekMonday, lt: selectedDayWeekSunday } },
    }),
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

  // Fenêtre générée à partir de dates calendaires fixes (pas seulement des
  // semaines qui ont des tâches) : navigation déterministe, une semaine sans
  // aucune tâche s'affiche à zéro plutôt que de disparaître silencieusement
  // et de décaler la fenêtre.
  const weekEntries = windowMondays.map((monday) => {
    const key = weekKey(monday);
    const existing = byWeek.get(key);
    return [
      key,
      existing ?? { label: weekLabel(monday), estimatedMinutes: 0, taskCount: 0, unestimatedCount: 0, sampleDate: monday },
    ] as const;
  });

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
  const today = toCalendarDate(now);
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
        // Semaine en cours (demande du 2026-08-01, "que j'ai une vue
        // précise") : mise en surbrillance dans les deux graphiques plutôt
        // que de la laisser se confondre avec les autres colonnes.
        isCurrentWeek: key === currentWeekKey,
      };
    }),
  );

  const unallocatedMinutes = unallocatedTasks.reduce(
    (sum, task) => sum + (task.estimatedMinutes ?? 0),
    0,
  );
  const unallocatedUnestimated = unallocatedTasks.filter((task) => !task.estimatedMinutes).length;

  const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

  // Vue jour : agrège les tâches de la semaine sélectionnée par jour exact
  // (pas par semaine), sur la base évènement/échéance choisie plus haut.
  const committedByDay = new Map<string, { minutes: number; count: number }>();
  for (const task of dayTasks) {
    const date = (basis === "echeance" ? task.dueDate : task.eventDate)!;
    const key = toCalendarDate(date).toISOString().slice(0, 10);
    const entry = committedByDay.get(key) ?? { minutes: 0, count: 0 };
    entry.minutes += task.estimatedMinutes ?? 0;
    entry.count += 1;
    committedByDay.set(key, entry);
  }
  const capacityByDay = new Map(dayCapacities.map((row) => [row.date.toISOString().slice(0, 10), row.availableMinutes]));
  const todayIso = today.toISOString().slice(0, 10);
  const dailyEntries: DailyEntry[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedDayWeekMonday.getTime() + i * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    const committed = committedByDay.get(iso);
    return {
      date: iso,
      dayLabel: `${DAY_NAMES[i]} ${dateFormatter.format(date)}`,
      committedMinutes: committed?.minutes ?? 0,
      taskCount: committed?.count ?? 0,
      capacityMinutes: capacityByDay.get(iso) ?? null,
      isToday: iso === todayIso,
    };
  });
  const averageDailyCapacityMinutes = averageCapacityMinutes !== null ? averageCapacityMinutes / 7 : null;
  const selectedDayWeekLastDay = new Date(selectedDayWeekSunday.getTime() - 86_400_000);

  // Tableau de bord (demande du 2026-08-01) : quatre indicateurs choisis par
  // le client parmi les suggestions proposées, pour une vision globale sans
  // avoir à déplier chaque section plus bas.
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

  // Écart moyen sur les 4 dernières semaines *complètes* : toujours ancré sur
  // "aujourd'hui", indépendamment de la fenêtre de semaines actuellement
  // affichée dans les graphiques ci-dessous (navigation) — le tableau de
  // bord reflète l'état réel actuel, pas la période qu'on est en train de
  // consulter. La semaine en cours est exclue : son temps réel est
  // mécaniquement incomplet tant qu'elle n'est pas terminée, la comparer à
  // un prévu entier afficherait un écart négatif systématique et trompeur.
  const trendAnchorStart = addWeeks(thisMonday, -4);
  const [trendAnchorTasks, trendAnchorTimeEntries] = await Promise.all([
    db.task.findMany({
      where: { ...ACTIVE_TASKS, [dateField]: { gte: trendAnchorStart, lt: thisMonday } },
      select: { eventDate: true, dueDate: true, estimatedMinutes: true },
    }),
    db.taskTimeEntry.findMany({
      where: { task: { ...ACTIVE_TASKS }, startedAt: { gte: trendAnchorStart, lt: thisMonday } },
      select: { startedAt: true, endedAt: true },
    }),
  ]);
  const trendAnchorEstimatedByWeek = new Map<string, number>();
  for (const task of trendAnchorTasks) {
    const date = (basis === "echeance" ? task.dueDate : task.eventDate)!;
    const key = weekKey(date);
    trendAnchorEstimatedByWeek.set(key, (trendAnchorEstimatedByWeek.get(key) ?? 0) + (task.estimatedMinutes ?? 0));
  }
  const trendAnchorRealByWeek = new Map<string, number>();
  for (const entry of trendAnchorTimeEntries) {
    const key = weekKey(entry.startedAt);
    trendAnchorRealByWeek.set(key, (trendAnchorRealByWeek.get(key) ?? 0) + sumTaskTimeMs([entry], now) / 60_000);
  }
  const last4WeeksMondays = Array.from({ length: 4 }, (_, i) => addWeeks(trendAnchorStart, i));
  const last4WeeksDeltas = last4WeeksMondays.map((monday) => {
    const key = weekKey(monday);
    return (trendAnchorRealByWeek.get(key) ?? 0) - (trendAnchorEstimatedByWeek.get(key) ?? 0);
  });
  const avgDeltaMinutes =
    last4WeeksDeltas.length > 0
      ? Math.round(last4WeeksDeltas.reduce((sum, delta) => sum + delta, 0) / last4WeeksDeltas.length)
      : null;

  // Construit les liens de navigation en conservant l'autre paramètre
  // (base de calcul / fenêtre de semaines) plutôt que de l'écraser à chaque
  // clic sur l'un ou l'autre contrôle.
  function hrefFor(overrides: {
    base?: PlanningBasis;
    semaine?: number;
    vue?: PlanningView;
    semaineJour?: number;
  }) {
    const nextBase = overrides.base ?? basis;
    const nextOffset = overrides.semaine ?? weekOffset;
    const nextView = overrides.vue ?? view;
    const nextDayOffset = overrides.semaineJour ?? dayWeekOffset;
    const params = new URLSearchParams();
    if (nextBase === "evenement") params.set("base", "evenement");
    if (nextOffset !== 0) params.set("semaine", String(nextOffset));
    if (nextView === "jour") params.set("vue", "jour");
    if (nextDayOffset !== 0) params.set("semaineJour", String(nextDayOffset));
    const query = params.toString();
    return query ? `/admin/planning?${query}` : "/admin/planning";
  }

  const windowLastSunday = new Date(addWeeks(windowStart, WINDOW_SIZE).getTime() - 86_400_000);

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
          {/* Vert quand le réel est en dessous du prévu (marge, pas de
              surcharge), rouge dans le cas inverse (demande du 2026-08-01) —
              l'opposé de "en retard sur le travail". */}
          <p className="mt-1 text-2xl font-medium text-ink">
            {avgDeltaMinutes === null ? (
              "—"
            ) : (
              <span className={avgDeltaMinutes > 0 ? "text-(--status-critical)" : "text-(--status-good)"}>
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

      {/* Vue semaine / vue jour (demande du 2026-08-01) : la vue jour permet
          de sélectionner une semaine précise pour voir sa répartition
          journalière — voir `DailyChart`. */}
      <div className="mt-4 inline-flex rounded-full border border-line p-1 text-sm">
        <Link
          href={hrefFor({ vue: "semaine" })}
          className={`rounded-full px-3 py-1.5 transition-colors ${
            view === "semaine" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
          }`}
        >
          Vue semaine
        </Link>
        <Link
          href={hrefFor({ vue: "jour" })}
          className={`rounded-full px-3 py-1.5 transition-colors ${
            view === "jour" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
          }`}
        >
          Vue jour
        </Link>
      </div>

      {/* Bascule de la base de calcul (demande du 2026-08-01) : même moteur,
          juste rattaché à une date différente — voir le commentaire sur
          `PlanningBasis` plus haut. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-line p-1 text-sm">
          <Link
            href={hrefFor({ base: "evenement" })}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              basis === "evenement" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            Par date d&apos;évènement
          </Link>
          <Link
            href={hrefFor({ base: "echeance" })}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              basis === "echeance" ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            Par échéance
          </Link>
        </div>

        {view === "semaine" ? (
          /* Navigation entre fenêtres de 16 semaines (demande du 2026-08-01,
             "avoir le choix des semaines dans les affichages") — décale la
             fenêtre affichée par blocs entiers plutôt qu'une plage de dates
             libre, pour rester simple à utiliser au quotidien. */
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={hrefFor({ semaine: weekOffset + 1 })}
              aria-label="Semaines précédentes"
              className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <CaretLeft size={14} weight="bold" />
            </Link>
            <span className="whitespace-nowrap text-ink-muted">
              {dateFormatter.format(windowStart)} – {dateFormatter.format(windowLastSunday)}
            </span>
            <Link
              href={hrefFor({ semaine: weekOffset - 1 })}
              aria-label="Semaines suivantes"
              className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <CaretRight size={14} weight="bold" />
            </Link>
            {weekOffset !== 0 && (
              <Link href={hrefFor({ semaine: 0 })} className="text-ink-muted underline hover:text-ink">
                Aujourd&apos;hui
              </Link>
            )}
          </div>
        ) : (
          /* Navigation d'une semaine à la fois pour la vue jour — "en
             sélectionnant la semaine" (demande du 2026-08-01), indépendante
             de la fenêtre de 16 semaines de la vue semaine. */
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={hrefFor({ semaineJour: dayWeekOffset - 1 })}
              aria-label="Semaine précédente"
              className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <CaretLeft size={14} weight="bold" />
            </Link>
            <span className="whitespace-nowrap text-ink-muted">
              {dateFormatter.format(selectedDayWeekMonday)} – {dateFormatter.format(selectedDayWeekLastDay)}
            </span>
            <Link
              href={hrefFor({ semaineJour: dayWeekOffset + 1 })}
              aria-label="Semaine suivante"
              className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <CaretRight size={14} weight="bold" />
            </Link>
            {dayWeekOffset !== 0 && (
              <Link href={hrefFor({ semaineJour: 0 })} className="text-ink-muted underline hover:text-ink">
                Aujourd&apos;hui
              </Link>
            )}
          </div>
        )}
      </div>

      {view === "semaine" ? (
        <>
          <div className="mt-8">
            <WorkloadChart data={weekData} averageCapacityMinutes={averageCapacityMinutes} />
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
      ) : (
        <div className="mt-8">
          <DailyChart days={dailyEntries} averageDailyCapacityMinutes={averageDailyCapacityMinutes} />
        </div>
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
