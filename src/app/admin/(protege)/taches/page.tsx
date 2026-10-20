import type { Metadata } from "next";
import Link from "next/link";
import { Check, Plus } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TaskTable } from "@/components/admin/task-table";
import { TaskViewTabs, type TaskView } from "@/components/admin/task-view-tabs";
import { TaskStatusTabs } from "@/components/admin/task-status-tabs";
import { CollapsibleSection } from "@/components/admin/collapsible-section";
import { TaskKanbanBoard } from "@/components/admin/task-kanban-board";
import { AgendaMonthView, parseAgendaParams } from "@/components/admin/agenda-month-view";
import { ArchivedTaskList } from "@/components/admin/task-archived-list";
import { TaskSortControl } from "@/components/admin/task-sort-control";
import { FilterMenu } from "@/components/admin/filter-menu";
import {
  TASK_STATUS,
  TASK_STATUS_LIST_KEY,
  TASK_TYPE_LIST_KEY,
  TASK_FORMAT_LIST_KEY,
  PALETTE_SWATCH_CLASSES,
  type PaletteColor,
} from "@/lib/dropdown-lists";
import {
  buildTaskOrderBy,
  isTaskSortField,
  EXCLUDE_DEMO_CLIENT_TASKS,
  type TaskSortField,
  type TaskSortDir,
} from "@/lib/tasks";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { Pagination } from "@/components/admin/pagination";
import { Scratchpad } from "@/components/admin/scratchpad";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";
import { getMyPreferences } from "@/lib/admin-preferences-server";
import { visibleColumns } from "@/lib/admin-preferences";

export const metadata: Metadata = {
  title: "Tâches — Admin Mikko Visuel",
};

// "clients" volontairement absente (vue "Par client" retirée le
// 2026-07-31) : un ancien lien `?vue=clients` retombe donc silencieusement
// sur "liste" via le ternaire ci-dessous, plutôt que d'afficher une vue qui
// n'existe plus.
const VALID_VIEWS: TaskView[] = ["liste", "kanban", "calendrier", "archivees"];

// Pagination (2026-08-24, suite au signalement de lenteur) : uniquement en
// vue Liste — Kanban/Calendrier/Archivées ont besoin du jeu complet.
const PAGE_SIZE = 40;

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    status?: string;
    vue?: string;
    mois?: string;
    cal?: string;
    jour?: string;
    tri?: string;
    dir?: string;
    q?: string;
    type?: string;
    format?: string;
    epingle?: string;
    page?: string;
    /** « Mes tâches » : seulement celles attribuées à l'admin connecté. */
    moi?: string;
  }>;
}) {
  const me = await verifyAdminSession();
  const params = await searchParams;
  const { clientId, status, vue, mois, cal, jour, tri, dir, q, type, format, epingle, page, moi } = params;
  const mineOnly = moi === "1";
  const preferences = await getMyPreferences();
  // Vue par défaut du profil (« Mon affichage », 2026-10-20) : seulement en
  // arrivant sur la page sans aucun paramètre. Un lien qui porte un filtre ou
  // un tri reste en vue Liste, et l'onglet « Liste » porte `vue=liste`.
  const requestedView = vue ?? (Object.keys(params).length === 0 ? preferences.views.taches : undefined);
  const view: TaskView = VALID_VIEWS.includes(requestedView as TaskView) ? (requestedView as TaskView) : "liste";
  // Tri par défaut du profil quand l'URL n'en impose pas.
  const sortField: TaskSortField = isTaskSortField(tri)
    ? tri
    : isTaskSortField(preferences.sorts.taches.field)
      ? preferences.sorts.taches.field
      : "evenement";
  const sortDir: TaskSortDir =
    dir === "desc" || dir === "asc" ? dir : tri ? "asc" : preferences.sorts.taches.dir;
  const taskColumns = visibleColumns(preferences, "taches");
  // Recherche/filtres Type/Format : uniquement pertinents pour la vue Liste
  // (pas de plomberie de propagation vers Kanban/Calendrier/Par client).
  const isListe = view === "liste";
  const pinnedOnly = epingle === "1";
  const currentPage = Math.max(1, Number(page) || 1);

  // Mêmes filtres, sans le statut : base des compteurs des onglets.
  const baseWhere = {
    ...EXCLUDE_DEMO_CLIENT_TASKS,
    archivedAt: null,
    ...(clientId ? { clientId } : {}),
    ...(pinnedOnly ? { pinnedAt: { not: null } } : {}),
    ...(mineOnly ? { assignedAdminId: me.id } : {}),
    ...(q ? { title: { contains: q } } : {}),
    ...(type ? { types: { some: { slug: type } } } : {}),
    ...(format ? { formats: { some: { slug: format } } } : {}),
  };

  const taskWhere = {
    ...EXCLUDE_DEMO_CLIENT_TASKS,
    archivedAt: view === "archivees" ? { not: null } : null,
    ...(clientId ? { clientId } : {}),
    ...(status ? { status: { slug: status } } : {}),
    ...(pinnedOnly ? { pinnedAt: { not: null } } : {}),
    ...(mineOnly ? { assignedAdminId: me.id } : {}),
    ...(isListe && q ? { title: { contains: q } } : {}),
    ...(isListe && type ? { types: { some: { slug: type } } } : {}),
    ...(isListe && format ? { formats: { some: { slug: format } } } : {}),
  };

  // Pagination (2026-08-24, suite au signalement de lenteur ; ajustée le
  // 2026-08-24 sur demande client : les tâches actives doivent rester
  // affichées en entier, seule la section "Terminées" (repliée par défaut)
  // pagine — sinon une tâche active pouvait se retrouver "cachée" sur une
  // page suivante selon le tri). Ne s'applique qu'en vue Liste sans filtre
  // de statut explicite ; avec un statut précis sélectionné, on repagine
  // l'ensemble filtré comme avant.
  const paginateDoneOnly = isListe && !status;
  const taskInclude = {
    client: true,
    status: true,
    types: true,
    formats: true,
    timeEntries: { select: { startedAt: true, endedAt: true } },
    assignedAdmin: { select: { email: true } },
    _count: { select: { deliverables: true, attachments: true } },
  } as const;
  const taskOrderBy = buildTaskOrderBy(sortField, sortDir);

  const [tasks, doneTasksPaginated, pageCount, statusList, typeList, formatList, clients, scratchpadItems, statusGroups] =
    await Promise.all([
      db.task.findMany({
        where: paginateDoneOnly
          ? { ...taskWhere, status: { slug: { not: TASK_STATUS.TERMINE } } }
          : taskWhere,
        include: taskInclude,
        orderBy: taskOrderBy,
        // Kanban/Calendrier/Archivées ont besoin du jeu complet — seule la
        // vue Liste pagine (et seulement quand un statut précis est filtré,
        // sinon les actives sont récupérées en entier ci-dessus).
        ...(isListe && !paginateDoneOnly ? { skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE } : {}),
      }),
      paginateDoneOnly
        ? db.task.findMany({
            where: { ...taskWhere, status: { slug: TASK_STATUS.TERMINE } },
            include: taskInclude,
            orderBy: taskOrderBy,
            skip: (currentPage - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
          })
        : Promise.resolve([]),
      paginateDoneOnly
        ? db.task.count({ where: { ...taskWhere, status: { slug: TASK_STATUS.TERMINE } } })
        : isListe
          ? db.task.count({ where: taskWhere })
          : Promise.resolve(0),
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
      db.client.findMany({ where: ACTIVE_CLIENTS, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.scratchpadItem.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, label: true } }),
      isListe
        ? db.task.groupBy({ by: ["statusId"], where: baseWhere, _count: { _all: true } })
        : Promise.resolve([]),
    ]);

  const totalPages = isListe ? Math.max(1, Math.ceil(pageCount / PAGE_SIZE)) : 1;

  const statusOptions =
    statusList?.items.map((item) => ({ slug: item.slug, label: item.label, color: item.color })) ??
    [];
  const statusCounts: Record<string, number> = {};
  for (const group of statusGroups) {
    const item = statusList?.items.find((entry) => entry.id === group.statusId);
    if (item) statusCounts[item.slug] = group._count._all;
  }
  const openTabCount = Object.entries(statusCounts)
    .filter(([slug]) => slug !== TASK_STATUS.TERMINE)
    .reduce((sum, [, count]) => sum + count, 0);
  const typeOptions = typeList?.items.map((item) => ({ slug: item.slug, label: item.label })) ?? [];
  const formatOptions =
    formatList?.items.map((item) => ({ slug: item.slug, label: item.label })) ?? [];

  const now = new Date();
  // Calendrier : vues Jour / Semaine / Mois (2026-10-20).
  const { mode: calendarMode, anchor: calendarAnchor } = parseAgendaParams({ cal, jour, mois }, now);
  const calendarYear = calendarAnchor.getFullYear();
  const calendarMonth = calendarAnchor.getMonth();

  const hasFilters = Boolean(clientId || status || q || type || format || pinnedOnly);
  const activeFilterCount = [clientId, status, q, type, format, pinnedOnly ? "1" : ""].filter(
    Boolean,
  ).length;

  const openCount = tasks.filter((task) => task.status.slug !== TASK_STATUS.TERMINE).length;
  const toolbarSubtitle =
    view === "archivees"
      ? `${tasks.length} archivée${tasks.length > 1 ? "s" : ""}`
      : `${openCount} à traiter`;

  return (
    <>
      {/* Barre d'outils unifiée (refonte macOS, 2026-10-14) : le sélecteur de
          vue, les filtres et la création tiennent sur la ligne du titre. */}
      <PageToolbar title="Tâches" subtitle={toolbarSubtitle}>
        {/* Travail à deux admins (2026-10-20) : bascule « Mes tâches ». */}
        <Link
          href={(() => {
            const next = new URLSearchParams();
            for (const [key, value] of Object.entries({ clientId, status, vue: view, q, type, format, epingle, tri, dir })) {
              if (value) next.set(key, value);
            }
            if (!mineOnly) next.set("moi", "1");
            return `/admin/taches?${next.toString()}`;
          })()}
          aria-pressed={mineOnly}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
            mineOnly ? "border-transparent bg-select text-ink" : "border-[var(--color-outline)] text-ink hover:bg-ink/[0.04]"
          }`}
        >
          {mineOnly && <Check size={16} weight="bold" />}
          Mes tâches
        </Link>
        <TaskViewTabs current={view} clientId={clientId} status={status} pinnedOnly={pinnedOnly} />
        <FilterMenu compact activeCount={activeFilterCount}>
          <div className="grid gap-4">
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
            <div className="h-px bg-line" />
            <form className="grid gap-3">
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

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
                >
                  Appliquer
                </button>
                {hasFilters && (
                  <Link
                    href="/admin/taches"
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    Réinitialiser
                  </Link>
                )}
              </div>
            </form>
          </div>
        </FilterMenu>
        <Link
          href="/admin/taches/nouveau"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          <Plus size={16} weight="bold" />
          Nouvelle tâche
        </Link>
      </PageToolbar>

      <div className={PAGE_BODY}>
        {isListe && (
          <TaskStatusTabs
            statuses={statusOptions}
            counts={statusCounts}
            openCount={openTabCount}
            current={status}
            params={{ clientId, q, type, format, epingle: pinnedOnly ? "1" : undefined, moi: mineOnly ? "1" : undefined, tri, dir }}
          />
        )}
        {/* Au-dessus des 4 vues (liste/kanban/calendrier/archivées) : un
            pense-bête reste utile quelle que soit la vue affichée. */}
        <Scratchpad initialItems={scratchpadItems} />

        {view === "kanban" && <TaskKanbanBoard tasks={tasks} statuses={statusOptions} />}

        {view === "calendrier" && (
          // Calendrier façon Google Agenda (livraison 3, 2026-10-20), point
          // de la couleur du statut.
          <AgendaMonthView
            items={tasks.map((task) => ({
              id: task.id,
              title: task.title,
              date: task.eventDate,
              dotClass:
                PALETTE_SWATCH_CLASSES[task.status.color as PaletteColor] ?? PALETTE_SWATCH_CLASSES.slate,
              href: `/admin/taches/${task.id}`,
              tooltip: `${task.client.name} · ${task.status.label}`,
            }))}
            mode={calendarMode}
            anchor={calendarAnchor}
            year={calendarYear}
            month={calendarMonth}
            basePath="/admin/taches"
            params={{
              vue: "calendrier",
              ...(clientId ? { clientId } : {}),
              ...(status ? { status } : {}),
            }}
            undatedLabel="Sans date d'évènement"
          />
        )}

        {view === "archivees" && <ArchivedTaskList tasks={tasks} />}

        {view === "liste" &&
          (() => {
            const activeTasks = paginateDoneOnly
              ? tasks
              : tasks.filter((task) => task.status.slug !== TASK_STATUS.TERMINE);
            const doneTasks = paginateDoneOnly
              ? doneTasksPaginated
              : tasks.filter((task) => task.status.slug === TASK_STATUS.TERMINE);
            const doneCount = paginateDoneOnly ? pageCount : doneTasks.length;
            const pagination = (
              <Pagination
                basePath="/admin/taches"
                currentPage={currentPage}
                totalPages={totalPages}
                searchParams={{ clientId, status, mois, tri, dir, q, type, format, epingle }}
              />
            );
            return (
              <>
                <TaskTable
                  tasks={activeTasks}
                  statusOptions={statusOptions}
                  sortField={sortField}
                  sortDir={sortDir}
                  clientId={clientId}
                  status={status}
                  columns={taskColumns}
                  emptyMessage="Aucune tâche en cours."
                />
                {/* Repliées par défaut (demande du client le 2026-07-30) : les
                    tâches terminées n'appellent plus d'action et poussaient le
                    reste de la liste hors de l'écran. Paginées (voir
                    paginateDoneOnly ci-dessus) sans filtre de statut explicite,
                    pour garder les tâches actives entièrement visibles tout en
                    limitant la requête sur l'historique des terminées. */}
                {doneCount > 0 && (
                  <div className="mt-10">
                    <CollapsibleSection title="Terminées" count={doneCount}>
                      <TaskTable
                        tasks={doneTasks}
                        statusOptions={statusOptions}
                        sortField={sortField}
                        sortDir={sortDir}
                        clientId={clientId}
                        status={status}
                        columns={taskColumns}
                      />
                      {paginateDoneOnly && pagination}
                    </CollapsibleSection>
                  </div>
                )}
                {!paginateDoneOnly && pagination}
              </>
            );
          })()}
      </div>
    </>
  );
}
