import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT_TASKS, isoWeekNumber } from "@/lib/tasks";
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
    where: { ...EXCLUDE_DEMO_CLIENT_TASKS, archivedAt: null, eventDate: { not: null } },
    select: { id: true, eventDate: true },
    orderBy: { eventDate: "asc" },
  });

  const byWeek = new Map<string, { label: string; count: number }>();
  for (const task of tasks) {
    const date = task.eventDate!;
    const key = weekKey(date);
    const entry = byWeek.get(key);
    if (entry) entry.count += 1;
    else byWeek.set(key, { label: weekLabel(date), count: 1 });
  }

  const weekData = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-16)
    .map(([key, value]) => ({ key, ...value }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Planning de charge</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Nombre de tâches actives par semaine, selon leur date d&apos;évènement — pour repérer une
        surcharge à l&apos;avance. Client de démonstration exclu, tâches sans date d&apos;évènement
        non comptées.
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
