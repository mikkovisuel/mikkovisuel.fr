import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { RecentActivity } from "@/components/admin/recent-activity";

export const metadata: Metadata = {
  title: "Tableau de bord — Admin Mikko Visuel",
};

export default async function AdminDashboardPage() {
  const admin = await verifyAdminSession();
  const since = admin.previousLoginAt;

  const [clientCount, taskCount, unpaidCount, overdueCount, toValidateCount] = await Promise.all([
    db.client.count(),
    db.task.count(),
    db.document.count({ where: { paymentStatus: "unpaid" } }),
    db.task.count({
      where: { dueDate: { lt: new Date() }, status: { slug: { not: TASK_STATUS.TERMINE } } },
    }),
    db.task.count({ where: { status: { slug: TASK_STATUS.A_VALIDER } } }),
  ]);

  const [batValidatedTasks, refusedTasks, newRequestTasks, newCommentRows] = since
    ? await Promise.all([
        db.task.findMany({
          where: { batValidatedAt: { gte: since } },
          include: { client: true },
          orderBy: { batValidatedAt: "desc" },
        }),
        db.task.findMany({
          where: { refusedAt: { gte: since } },
          include: { client: true },
          orderBy: { refusedAt: "desc" },
        }),
        db.task.findMany({
          where: { createdByType: "CLIENT_USER", createdAt: { gte: since } },
          include: { client: true },
          orderBy: { createdAt: "desc" },
        }),
        db.taskComment.findMany({
          where: { authorType: "CLIENT_USER", createdAt: { gte: since } },
          include: { task: { include: { client: true } } },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], [], [], []];

  const batValidated = batValidatedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    clientName: task.client.name,
    validatedAt: task.batValidatedAt!,
  }));
  const refused = refusedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    clientName: task.client.name,
    reason: task.refusalReason ?? "",
  }));
  const newRequests = newRequestTasks.map((task) => ({
    id: task.id,
    title: task.title,
    clientName: task.client.name,
  }));
  const newComments = newCommentRows.map((comment) => ({
    id: comment.id,
    taskId: comment.taskId,
    taskTitle: comment.task.title,
    clientName: comment.task.client.name,
    authorName: comment.authorName,
    body: comment.body,
  }));

  const hasActivity =
    batValidated.length > 0 ||
    refused.length > 0 ||
    newRequests.length > 0 ||
    newComments.length > 0;

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

      {since && hasActivity && (
        <RecentActivity
          since={since}
          batValidated={batValidated}
          refused={refused}
          newRequests={newRequests}
          newComments={newComments}
        />
      )}
    </div>
  );
}
