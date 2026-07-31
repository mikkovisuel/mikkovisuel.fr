import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ACTIVE_TASKS, isoWeekNumber } from "@/lib/tasks";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { WorkloadChart } from "@/components/admin/workload-chart";
import { CapacityPopup } from "@/components/admin/capacity-popup";
import { formatHoursFromMinutes } from "@/lib/time-tracking";
import { getCapacityMinutes, getCapacityWeeksWindow, weekDays } from "@/lib/capacity";

export const metadata: Metadata = {
  title: "Planning de charge — Admin Mikko Visuel",
};

function weekKey(date: Date) {
  return `${date.getFullYear()}-S${String(isoWeekNumber(date)).padStart(2, "0")}`;
}

function weekLabel(date: Date) {
  return `S${isoWeekNumber(date)}`;
}

export default async function PlanningPage() {
  await verifyAdminSession();

  const [tasks, unallocatedTasks, capacityWeeks] = await Promise.all([
    db.task.findMany({
      where: { ...ACTIVE_TASKS, eventDate: { not: null } },
      select: { id: true, eventDate: true, estimatedMinutes: true },
      orderBy: { eventDate: "asc" },
    }),
    // "Charge non répartie" (demande du 2026-07-31) : tâches actives sans
    // date d'évènement, donc absentes du graphique hebdomadaire — un travail
    // déjà promis mais pas encore placé dans le temps.
    db.task.findMany({
      where: { ...ACTIVE_TASKS, eventDate: null, status: { slug: { not: TASK_STATUS.TERMINE } } },
      select: { id: true, title: true, estimatedMinutes: true, dueDate: true },
      orderBy: { dueDate: "asc" },
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
    const date = task.eventDate!;
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

  // Capacité réelle par semaine affichée, en complément du graphique existant
  // (repli sur les seuils fixes dans `WorkloadChart` si aucune capacité n'a
  // été saisie pour cette semaine-là).
  const weekData = await Promise.all(
    weekEntries.map(async ([key, value]) => {
      const [monday, , , , , , sunday] = weekDays(value.sampleDate);
      const capacityMinutes = await getCapacityMinutes(monday, sunday);
      return { key, label: value.label, estimatedMinutes: value.estimatedMinutes, taskCount: value.taskCount, unestimatedCount: value.unestimatedCount, capacityMinutes };
    }),
  );

  const unallocatedMinutes = unallocatedTasks.reduce(
    (sum, task) => sum + (task.estimatedMinutes ?? 0),
    0,
  );
  const unallocatedUnestimated = unallocatedTasks.filter((task) => !task.estimatedMinutes).length;

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Planning de charge</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Temps de travail estimé par semaine, selon la date d&apos;évènement des tâches — pour
            repérer une surcharge à l&apos;avance. Client de démonstration exclu, tâches archivées
            non comptées.
          </p>
        </div>
        <CapacityPopup weeks={capacityWeeks} />
      </div>

      {weekData.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucune tâche avec une date d&apos;évènement.</p>
      ) : (
        <div className="mt-8">
          <WorkloadChart data={weekData} />
        </div>
      )}

      <section className="mt-10 rounded-2xl border border-line p-5">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">
          Charge non répartie
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tâches actives sans date d&apos;évènement — donc absentes du graphique ci-dessus.
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
              {unallocatedTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-ink">{task.title}</span>
                  <span className="whitespace-nowrap text-ink-muted">
                    {task.estimatedMinutes ? formatHoursFromMinutes(task.estimatedMinutes) : "non estimée"}
                    {task.dueDate &&
                      ` · échéance ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(task.dueDate)}`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
