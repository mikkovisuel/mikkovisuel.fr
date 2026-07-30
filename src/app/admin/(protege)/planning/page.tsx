import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ACTIVE_TASKS, isoWeekNumber } from "@/lib/tasks";
import { WorkloadChart } from "@/components/admin/workload-chart";

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

  const tasks = await db.task.findMany({
    where: { ...ACTIVE_TASKS, eventDate: { not: null } },
    select: { id: true, eventDate: true, estimatedMinutes: true },
    orderBy: { eventDate: "asc" },
  });

  // Charge pondérée par le temps estimé plutôt que par le nombre de tâches
  // (2026-07-30) : les tâches sans estimation sont comptées à part au lieu
  // d'être noyées à zéro, pour que leur absence se voie.
  const byWeek = new Map<
    string,
    { label: string; estimatedMinutes: number; taskCount: number; unestimatedCount: number }
  >();
  for (const task of tasks) {
    const date = task.eventDate!;
    const key = weekKey(date);
    const entry =
      byWeek.get(key) ??
      { label: weekLabel(date), estimatedMinutes: 0, taskCount: 0, unestimatedCount: 0 };
    entry.taskCount += 1;
    if (task.estimatedMinutes && task.estimatedMinutes > 0) {
      entry.estimatedMinutes += task.estimatedMinutes;
    } else {
      entry.unestimatedCount += 1;
    }
    byWeek.set(key, entry);
  }

  const weekData = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-16)
    .map(([key, value]) => ({ key, ...value }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Planning de charge</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Temps de travail estimé par semaine, selon la date d&apos;évènement des tâches — pour
        repérer une surcharge à l&apos;avance. Client de démonstration exclu, tâches archivées et
        tâches sans date d&apos;évènement non comptées.
      </p>

      {weekData.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucune tâche avec une date d&apos;évènement.</p>
      ) : (
        <div className="mt-8">
          <WorkloadChart data={weekData} />
        </div>
      )}
    </div>
  );
}
