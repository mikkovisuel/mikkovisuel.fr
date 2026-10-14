import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimerHeaderWidget } from "@/components/admin/timer-header-widget";
import { GlobalSearchBar } from "@/components/admin/global-search-bar";
import { SettingsMenu } from "@/components/admin/settings-menu";
import { AdminMobileNav, AdminSidebarNav } from "@/components/admin/admin-nav";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { ACTIVE_TASKS } from "@/lib/tasks";
import { SOCIAL_POST_STATUS } from "@/lib/social-posts";

// La liste des rubriques et leur regroupement vivent dans
// `src/components/admin/admin-nav.tsx`.

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await verifyAdminSession();

  // Chronomètre visible dans tout l'admin (pas seulement la fiche tâche) —
  // au plus une ligne `endedAt: null` à la fois PAR ADMIN, voir
  // `startTaskTimer` (chaque admin a son propre chrono, indépendant).
  const [runningEntry, openTaskCount, prospectReminderCount, socialPostsDueCount, tasksByStatus, tasksByClient] = await Promise.all([
    db.taskTimeEntry.findFirst({
      where: { endedAt: null, startedByAdminId: admin.id },
      include: { task: true },
    }),
    // Pastille "Tâches" : nombre de tâches restant à traiter, c'est-à-dire
    // toutes sauf celles au statut "Terminé" (demande du client le
    // 2026-07-30 — auparavant la pastille additionnait "en retard" et "à
    // valider", ce qui ne correspondait à aucun chiffre affiché ailleurs).
    // Les archivées sont exclues comme partout : elles ne sont plus dans le
    // flux de travail.
    db.task.count({
      where: { ...ACTIVE_TASKS, status: { slug: { not: TASK_STATUS.TERMINE } } },
    }),
    // Pastille "Prospection" — relances dues aujourd'hui ou en retard, pas
    // encore envoyées.
    db.prospect.count({
      where: { nextReminderAt: { lte: new Date() }, reminderSentAt: null },
    }),
    // Pastille "Réseaux" — ce qui attend une action immédiate : les
    // publications validées dont l'heure est arrivée, plus (2026-09-25)
    // celles dont la création est terminée et les visuels déjà récupérés,
    // mais qui dorment encore en brouillon.
    db.socialPost.count({
      where: {
        OR: [
          { status: SOCIAL_POST_STATUS.VALIDE, scheduledAt: { lte: new Date() } },
          {
            status: { in: [SOCIAL_POST_STATUS.IDEE, SOCIAL_POST_STATUS.REDACTION] },
            taskMediaImportedAt: { not: null },
            sourceTask: { internal: true, status: { slug: TASK_STATUS.TERMINE } },
          },
        ],
      },
    }),
    // Raccourcis de la barre latérale sous « Tâches » (refonte macOS,
    // 2026-10-14) : tâches restant à traiter, par statut et par client. Même
    // périmètre que la pastille « Tâches » ci-dessus.
    db.task.groupBy({
      by: ["statusId"],
      where: { ...ACTIVE_TASKS, status: { slug: { not: TASK_STATUS.TERMINE } } },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ["clientId"],
      where: { ...ACTIVE_TASKS, status: { slug: { not: TASK_STATUS.TERMINE } } },
      _count: { _all: true },
      orderBy: { _count: { clientId: "desc" } },
      take: 8,
    }),
  ]);

  const [statusItems, clientItems] = await Promise.all([
    db.dropdownItem.findMany({
      where: { id: { in: tasksByStatus.map((row) => row.statusId) } },
      select: { id: true, slug: true, label: true, color: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.client.findMany({
      where: { id: { in: tasksByClient.map((row) => row.clientId) } },
      select: { id: true, name: true },
    }),
  ]);
  const taskShortcuts = {
    statuses: statusItems.map((item) => ({
      slug: item.slug,
      label: item.label,
      color: item.color,
      count: tasksByStatus.find((row) => row.statusId === item.id)?._count._all ?? 0,
    })),
    clients: tasksByClient.flatMap((row) => {
      const client = clientItems.find((item) => item.id === row.clientId);
      return client ? [{ id: client.id, name: client.name, count: row._count._all }] : [];
    }),
  };

  const badges = {
    "/admin/taches": openTaskCount,
    "/admin/prospection": prospectReminderCount,
    "/admin/reseaux": socialPostsDueCount,
  };
  const timer = runningEntry && (
    <TimerHeaderWidget
      activeTimer={{
        taskId: runningEntry.taskId,
        taskTitle: runningEntry.task.title,
        startedAt: runningEntry.startedAt.toISOString(),
      }}
    />
  );

  // Refonte « macOS » (2026-10-14) : barre latérale à la manière du Finder
  // ou de Mail sur ordinateur, en-tête compact sur téléphone et tablette.
  // `admin-macos` porte la palette, la police système et les rayons propres
  // à l'admin (voir globals.css) — le site public et l'espace client n'en
  // héritent pas. Pas de faux feux de fenêtre : dans l'application installée,
  // macOS dessine déjà les vrais.
  return (
    <div className="admin-macos flex min-h-dvh flex-1 bg-surface text-ink">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-sidebar lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-4 pb-3 pt-5">
          <BrandLogo className="h-6" />
          <span className="text-[13px] font-semibold text-ink">Admin</span>
        </Link>
        <div className="px-3 pb-2">
          <GlobalSearchBar />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <AdminSidebarNav badges={badges} taskShortcuts={taskShortcuts} />
        </div>
        {timer && <div className="px-3 pb-3">{timer}</div>}
        <div className="flex items-center gap-2 border-t border-line px-3 py-3">
          <span className="min-w-0 flex-1 truncate text-xs text-ink-muted" title={admin.email}>
            {admin.email}
          </span>
          <ThemeToggle />
          <LogoutButton iconOnly />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-sidebar lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/admin" className="flex items-center gap-2">
              <BrandLogo className="h-6" />
              <span className="text-[13px] font-semibold text-ink">Admin</span>
            </Link>
            <div className="flex items-center gap-2">
              <SettingsMenu />
              <ThemeToggle />
              <LogoutButton iconOnly />
            </div>
          </div>
          {timer && <div className="px-4 pb-3 sm:px-6">{timer}</div>}
          <AdminMobileNav badges={badges} />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
