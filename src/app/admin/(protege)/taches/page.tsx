import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TaskTable } from "@/components/admin/task-table";
import { TaskViewTabs, type TaskView } from "@/components/admin/task-view-tabs";
import { TaskKanbanBoard } from "@/components/admin/task-kanban-board";
import { TaskCalendarView } from "@/components/admin/task-calendar-view";
import { TaskByClientView } from "@/components/admin/task-by-client-view";
import { ArchivedTaskList } from "@/components/admin/task-archived-list";
import { TaskSortControl } from "@/components/admin/task-sort-control";
import {
  TASK_STATUS,
  TASK_STATUS_LIST_KEY,
  TASK_TYPE_LIST_KEY,
  TASK_FORMAT_LIST_KEY,
} from "@/lib/dropdown-lists";
import {
  buildTaskOrderBy,
  isTaskSortField,
  EXCLUDE_DEMO_CLIENT_TASKS,
  type TaskSortField,
  type TaskSortDir,
} from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Tâches — Admin Mikko Visuel",
};

const VALID_VIEWS: TaskView[] = ["liste", "kanban", "calendrier", "clients", "archivees"];

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    status?: string;
    vue?: string;
    mois?: string;
    tri?: string;
    dir?: string;
    q?: string;
    type?: string;
    format?: string;
    epingle?: string;
  }>;
}) {
  await verifyAdminSession();
  const { clientId, status, vue, mois, tri, dir, q, type, format, epingle } = await searchParams;
  const view: TaskView = VALID_VIEWS.includes(vue as TaskView) ? (vue as TaskView) : "liste";
  const sortField: TaskSortField = isTaskSortField(tri) ? tri : "evenement";
  const sortDir: TaskSortDir = dir === "desc" ? "desc" : "asc";
  // Recherche/filtres Type/Format : uniquement pertinents pour la vue Liste
  // (pas de plomberie de propagation vers Kanban/Calendrier/Par client).
  const isListe = view === "liste";
  const pinnedOnly = epingle === "1";

  const [tasks, statusList, typeList, formatList, clients] = await Promise.all([
    db.task.findMany({
      where: {
        ...EXCLUDE_DEMO_CLIENT_TASKS,
        archivedAt: view === "archivees" ? { not: null } : null,
        ...(clientId ? { clientId } : {}),
        ...(status ? { status: { slug: status } } : {}),
        ...(pinnedOnly ? { pinnedAt: { not: null } } : {}),
        ...(isListe && q ? { title: { contains: q } } : {}),
        ...(isListe && type ? { types: { some: { slug: type } } } : {}),
        ...(isListe && format ? { formats: { some: { slug: format } } } : {}),
      },
      include: {
        client: true,
        status: true,
        types: true,
        formats: true,
        timeEntries: { select: { startedAt: true, endedAt: true } },
        _count: { select: { deliverables: true, attachments: true } },
      },
      orderBy: buildTaskOrderBy(sortField, sortDir),
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_STATUS_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_TYPE_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_FORMAT_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.client.findMany({ where: { isDemo: false }, orderBy: { name: "asc" } }),
  ]);

  const statusOptions =
    statusList?.items.map((item) => ({ slug: item.slug, label: item.label, color: item.color })) ??
    [];
  const typeOptions = typeList?.items.map((item) => ({ slug: item.slug, label: item.label })) ?? [];
  const formatOptions =
    formatList?.items.map((item) => ({ slug: item.slug, label: item.label })) ?? [];

  const now = new Date();
  const [moisYear, moisMonth] = mois?.match(/^(\d{4})-(\d{2})$/)?.slice(1) ?? [];
  const calendarYear = moisYear ? Number(moisYear) : now.getFullYear();
  const calendarMonth = moisMonth ? Number(moisMonth) - 1 : now.getMonth();

  const hasFilters = Boolean(clientId || status || q || type || format || pinnedOnly);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Tâches</h1>
        <Link
          href="/admin/taches/nouveau"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          <Plus size={16} weight="bold" />
          Nouvelle tâche
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <TaskViewTabs current={view} clientId={clientId} status={status} pinnedOnly={pinnedOnly} />
        <TaskSortControl
          basePath="/admin/taches"
          sortField={sortField}
          sortDir={sortDir}
          extraParams={{
            clientId,
            status,
            vue: view !== "liste" ? view : undefined,
            mois,
            epingle: pinnedOnly ? "1" : undefined,
          }}
        />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        {view !== "liste" && <input type="hidden" name="vue" value={view} />}
        {tri && <input type="hidden" name="tri" value={tri} />}
        {dir && <input type="hidden" name="dir" value={dir} />}
        {isListe && (
          <div className="flex flex-col gap-2">
            <label htmlFor="q" className="text-sm font-medium text-ink">
              Rechercher
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Titre de la tâche"
              className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="clientId" className="text-sm font-medium text-ink">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={clientId ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Tous les clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="status" className="text-sm font-medium text-ink">
            Statut
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Tous les statuts</option>
            {statusOptions.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {isListe && (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="type" className="text-sm font-medium text-ink">
                Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue={type ?? ""}
                className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Tous les types</option>
                {typeOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="format" className="text-sm font-medium text-ink">
                Format
              </label>
              <select
                id="format"
                name="format"
                defaultValue={format ?? ""}
                className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Tous les formats</option>
                {formatOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <label
          htmlFor="epingle"
          className="flex items-center gap-2 rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink"
        >
          <input
            id="epingle"
            name="epingle"
            type="checkbox"
            value="1"
            defaultChecked={pinnedOnly}
            className="accent-accent"
          />
          Épinglées uniquement
        </label>

        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Filtrer
        </button>
        {hasFilters && (
          <Link
            href="/admin/taches"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {view === "kanban" && <TaskKanbanBoard tasks={tasks} statuses={statusOptions} />}

      {view === "calendrier" && (
        <TaskCalendarView
          tasks={tasks}
          year={calendarYear}
          month={calendarMonth}
          clientId={clientId}
          status={status}
        />
      )}

      {view === "clients" && <TaskByClientView tasks={tasks} statusOptions={statusOptions} />}

      {view === "archivees" && <ArchivedTaskList tasks={tasks} />}

      {view === "liste" &&
        (() => {
          const activeTasks = tasks.filter((task) => task.status.slug !== TASK_STATUS.TERMINE);
          const doneTasks = tasks.filter((task) => task.status.slug === TASK_STATUS.TERMINE);
          return (
            <>
              <TaskTable
                tasks={activeTasks}
                statusOptions={statusOptions}
                sortField={sortField}
                sortDir={sortDir}
                clientId={clientId}
                status={status}
                emptyMessage="Aucune tâche en cours."
              />
              {doneTasks.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-sm font-medium text-ink-muted">
                    Terminées ({doneTasks.length})
                  </h2>
                  <TaskTable
                    tasks={doneTasks}
                    statusOptions={statusOptions}
                    sortField={sortField}
                    sortDir={sortDir}
                    clientId={clientId}
                    status={status}
                  />
                </div>
              )}
            </>
          );
        })()}
    </div>
  );
}
