import type { Metadata } from "next";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TaskCalendarView } from "@/components/admin/task-calendar-view";

export const metadata: Metadata = {
  title: "Calendrier — Espace client Mikko Visuel",
};

export default async function ClientCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const clientUser = await verifyClientSession();
  const { mois } = await searchParams;

  const now = new Date();
  const [moisYear, moisMonth] = mois?.match(/^(\d{4})-(\d{2})$/)?.slice(1) ?? [];
  const year = moisYear ? Number(moisYear) : now.getFullYear();
  const month = moisMonth ? Number(moisMonth) - 1 : now.getMonth();

  const tasks = await db.task.findMany({
    where: { clientId: clientUser.clientId, archivedAt: null },
    include: { status: true },
    orderBy: { eventDate: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Calendrier</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Vos demandes classées par date d&apos;événement.
      </p>

      <TaskCalendarView
        tasks={tasks}
        year={year}
        month={month}
        basePath="/espace-client/calendrier"
        taskBasePath="/espace-client/taches"
      />
    </div>
  );
}
