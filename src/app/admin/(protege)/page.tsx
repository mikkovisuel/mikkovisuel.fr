import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";

export const metadata: Metadata = {
  title: "Tableau de bord — Admin Mikko Visuel",
};

export default async function AdminDashboardPage() {
  const [clientCount, taskCount, unpaidCount, overdueCount, toValidateCount] = await Promise.all([
    db.client.count(),
    db.task.count(),
    db.document.count({ where: { paymentStatus: "unpaid" } }),
    db.task.count({
      where: { dueDate: { lt: new Date() }, status: { slug: { not: TASK_STATUS.TERMINE } } },
    }),
    db.task.count({ where: { status: { slug: TASK_STATUS.A_VALIDER } } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Tableau de bord
      </h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line p-6">
          <p className="text-sm text-ink-muted">Clients</p>
          <p className="mt-2 font-display text-3xl font-medium text-ink">{clientCount}</p>
        </div>
        <div className="rounded-2xl border border-line p-6">
          <p className="text-sm text-ink-muted">Tâches</p>
          <p className="mt-2 font-display text-3xl font-medium text-ink">{taskCount}</p>
          {(overdueCount > 0 || toValidateCount > 0) && (
            <div className="mt-3 flex flex-col gap-1 text-sm">
              {overdueCount > 0 && (
                <Link
                  href="/admin/taches?tri=echeance&dir=asc"
                  className="font-medium text-danger transition-colors hover:underline"
                >
                  {overdueCount} en retard
                </Link>
              )}
              {toValidateCount > 0 && (
                <Link
                  href="/admin/taches?status=a-valider"
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  {toValidateCount} à valider
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-line p-6">
          <p className="text-sm text-ink-muted">Factures en attente</p>
          <p className="mt-2 font-display text-3xl font-medium text-ink">{unpaidCount}</p>
        </div>
      </div>
    </div>
  );
}
