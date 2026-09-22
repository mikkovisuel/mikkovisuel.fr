import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS, TASK_STATUS_LIST_KEY } from "@/lib/dropdown-lists";
import { ACTIVE_TASKS, startOfToday } from "@/lib/tasks";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { RecentActivity } from "@/components/admin/recent-activity";
import { PinnedTasks } from "@/components/admin/pinned-tasks";
import { UpcomingEvents } from "@/components/admin/upcoming-events";
import { StatusBreakdown } from "@/components/admin/status-breakdown";
import { InactiveClients } from "@/components/admin/inactive-clients";
import { ClientLoginJournal } from "@/components/admin/client-login-journal";
import { InstallPwaCta } from "@/components/install-pwa-cta";
import { SocialToday } from "@/components/admin/social-today";

const INACTIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

export const metadata: Metadata = {
  title: "Tableau de bord — Admin Mikko Visuel",
};

export default async function AdminDashboardPage() {
  const admin = await verifyAdminSession();
  const since = admin.previousLoginAt;

  const [clientCount, taskCount, openTaskCount, unpaidCount, overdueCount, toValidateCount] =
    await Promise.all([
      db.client.count({ where: ACTIVE_CLIENTS }),
      db.task.count({ where: ACTIVE_TASKS }),
      // Nombre de tâches en cours (hors "Terminé") — c'est le chiffre le plus
      // utile en un coup d'œil sur le tableau de bord ; le total (incluant les
      // tâches terminées) reste affiché en petit en dessous.
      db.task.count({
        where: { ...ACTIVE_TASKS, status: { slug: { not: TASK_STATUS.TERMINE } } },
      }),
      db.document.count({ where: { paymentStatus: "unpaid" } }),
      db.task.count({
        where: {
          ...ACTIVE_TASKS,
          dueDate: { lt: startOfToday() },
          status: { slug: { not: TASK_STATUS.TERMINE } },
        },
      }),
      db.task.count({
        where: { ...ACTIVE_TASKS, status: { slug: TASK_STATUS.A_VALIDER } },
      }),
    ]);

  const [batValidatedTasks, refusedTasks, newRequestTasks, newCommentRows] = since
    ? await Promise.all([
        db.task.findMany({
          where: { ...ACTIVE_TASKS, batValidatedAt: { gte: since } },
          include: { client: true },
          orderBy: { batValidatedAt: "desc" },
        }),
        db.task.findMany({
          where: { ...ACTIVE_TASKS, refusedAt: { gte: since } },
          include: { client: true },
          orderBy: { refusedAt: "desc" },
        }),
        db.task.findMany({
          where: { ...ACTIVE_TASKS, createdByType: "CLIENT_USER", createdAt: { gte: since } },
          include: { client: true },
          orderBy: { createdAt: "desc" },
        }),
        db.taskComment.findMany({
          where: {
            authorType: "CLIENT_USER",
            createdAt: { gte: since },
            task: ACTIVE_TASKS,
          },
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

  const [pinnedTaskRows, upcomingTaskRows, statusList, statusGroups, clientsWithLastTask, loginEventRows] =
    await Promise.all([
      db.task.findMany({
        where: { ...ACTIVE_TASKS, pinnedAt: { not: null } },
        include: { client: true, status: true },
        orderBy: { pinnedAt: "desc" },
      }),
      db.task.findMany({
        where: { ...ACTIVE_TASKS, eventDate: { gte: new Date() } },
        include: { client: true, status: true },
        orderBy: { eventDate: "asc" },
        take: 6,
      }),
      db.dropdownList.findUnique({
        where: { key: TASK_STATUS_LIST_KEY },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      db.task.groupBy({
        by: ["statusId"],
        where: ACTIVE_TASKS,
        _count: { _all: true },
      }),
      db.client.findMany({
        where: ACTIVE_CLIENTS,
        include: {
          tasks: {
            where: { archivedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
      db.clientLoginEvent.findMany({
        orderBy: { loggedInAt: "desc" },
        take: 8,
        include: { clientContact: { include: { client: true, contact: true } } },
      }),
    ]);

  const pinnedTasks = pinnedTaskRows.map((task) => ({
    id: task.id,
    title: task.title,
    clientName: task.client.name,
    statusLabel: task.status.label,
    eventDate: task.eventDate,
  }));

  const upcomingEvents = upcomingTaskRows.map((task) => ({
    id: task.id,
    title: task.title,
    eventDate: task.eventDate!,
    clientName: task.client.name,
    statusLabel: task.status.label,
  }));

  const taskCountByStatusId = new Map(statusGroups.map((group) => [group.statusId, group._count._all]));
  const statusBreakdown =
    statusList?.items.map((item) => ({
      slug: item.slug,
      label: item.label,
      color: item.color,
      count: taskCountByStatusId.get(item.id) ?? 0,
    })) ?? [];

  const inactiveThreshold = new Date(new Date().getTime() - INACTIVE_THRESHOLD_MS);
  const inactiveClients = clientsWithLastTask
    .filter((client) => client.tasks.length === 0 || client.tasks[0].createdAt < inactiveThreshold)
    .map((client) => ({
      id: client.id,
      name: client.name,
      lastTaskAt: client.tasks[0]?.createdAt ?? null,
    }));

  const loginEvents = loginEventRows.map((event) => ({
    id: event.id,
    clientId: event.clientContact.client.id,
    clientName: event.clientContact.client.name,
    userName: event.clientContact.contact.name,
    loggedInAt: event.loggedInAt,
  }));

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Tableau de bord
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line p-6">
          <p className="text-sm text-ink-muted">Clients</p>
          <p className="mt-2 font-display text-3xl font-medium text-ink">{clientCount}</p>
        </div>
        <div className="rounded-2xl border border-line p-6">
          <p className="text-sm text-ink-muted">Tâches en cours</p>
          <p className="mt-2 font-display text-3xl font-medium text-ink">{openTaskCount}</p>
          <p className="mt-1 text-xs text-ink-muted">{taskCount} au total</p>
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

      <SocialToday />

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <PinnedTasks tasks={pinnedTasks} />
        <UpcomingEvents tasks={upcomingEvents} />
        <StatusBreakdown statuses={statusBreakdown} />
        <InactiveClients clients={inactiveClients} />
        <ClientLoginJournal events={loginEvents} />
      </div>

      <div className="mt-12 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-ink">Installer le tableau de bord</p>
          <p className="mt-1 text-sm text-ink-muted">
            Ajoutez-le à l&apos;écran d&apos;accueil de votre téléphone ou
            ordinateur pour y accéder directement, sans navigateur.
          </p>
        </div>
        <InstallPwaCta />
      </div>
    </div>
  );
}
