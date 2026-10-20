import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimerHeaderWidget } from "@/components/admin/timer-header-widget";
import { SettingsMenu } from "@/components/admin/settings-menu";
import { WorkspaceShell } from "@/components/admin/workspace-shell";
import { roboto } from "./fonts";
import { accentStyle, NAV_ITEMS, TEXT_SIZE_OPTIONS, parseAdminPreferences } from "@/lib/admin-preferences";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { ACTIVE_TASKS } from "@/lib/tasks";
import { SOCIAL_POST_STATUS } from "@/lib/social-posts";

// La coquille (barre du haut, tiroir, feuille) vit dans
// `src/components/admin/workspace-shell.tsx`, la liste des rubriques dans
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
  const [runningEntry, openTaskCount, prospectReminderCount, socialPostsDueCount, tasksByClient] = await Promise.all([
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
    // Raccourcis clients du tiroir sous « Tâches » : tâches restant à
    // traiter, même périmètre que la pastille « Tâches » ci-dessus.
    db.task.groupBy({
      by: ["clientId"],
      where: { ...ACTIVE_TASKS, status: { slug: { not: TASK_STATUS.TERMINE } } },
      _count: { _all: true },
      orderBy: { _count: { clientId: "desc" } },
      take: 8,
    }),
  ]);

  const clientItems = await db.client.findMany({
    where: { id: { in: tasksByClient.map((row) => row.clientId) } },
    select: { id: true, name: true },
  });
  const taskShortcuts = {
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

  const initials = admin.email.slice(0, 1).toUpperCase();
  const preferences = parseAdminPreferences(admin.preferences);
  const rootPercent = TEXT_SIZE_OPTIONS.find((option) => option.value === preferences.textSize)?.rootPercent ?? 100;
  const homeHref = NAV_ITEMS.find((item) => item.key === preferences.home)?.href ?? "/admin";

  // Coquille « Workspace » (2026-10-20), qui remplace la refonte « macOS ».
  // `admin-workspace` porte la palette, Roboto et les rayons propres à
  // l'admin (voir globals.css) : le site public et l'espace client n'en
  // héritent pas.
  return (
    <div
      data-density={preferences.density}
      data-accent={preferences.accent ? "" : undefined}
      style={accentStyle(preferences.accent)}
      className={`admin-workspace ${roboto.variable} flex min-h-dvh flex-1 flex-col bg-canvas text-ink lg:h-dvh lg:overflow-hidden`}
    >
      {/* Taille du texte (« Mon affichage ») : la racine du document est
          agrandie ou réduite tant qu'une page admin est affichée — ce style
          disparaît avec la mise en page admin. */}
      {rootPercent !== 100 && <style>{`html{font-size:${rootPercent}%}`}</style>}
      <WorkspaceShell
        homeHref={homeHref}
        navPreferences={{
          order: preferences.nav.order,
          hidden: preferences.nav.hidden,
          counters: preferences.drawer.counters,
          clientShortcuts: preferences.drawer.clientShortcuts,
        }}
        drawerExpandedByDefault={preferences.drawer.expanded}
        badges={badges}
        taskShortcuts={taskShortcuts}
        timer={timer}
        actions={
          <>
            <ThemeToggle />
            <SettingsMenu density={preferences.density} />
            <LogoutButton iconOnly />
            {/* Pastille du compte : ouvre « Mon affichage », comme l'avatar
                Google ouvre la gestion du compte. Dans un `div` : la règle des
                icônes rondes de la barre ne vise que les liens directs. */}
            <div>
              <Link
                href="/admin/mon-affichage"
                title={`${admin.email} — Mon affichage`}
                aria-label={`Mon affichage (${admin.email})`}
                className="ml-1 inline-flex h-8 w-8 select-none items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-ink"
              >
                {initials}
              </Link>
            </div>
          </>
        }
      >
        {children}
      </WorkspaceShell>
    </div>
  );
}
