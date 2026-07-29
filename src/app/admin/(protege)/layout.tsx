import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimerHeaderWidget } from "@/components/admin/timer-header-widget";
import { GlobalSearchBar } from "@/components/admin/global-search-bar";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { EXCLUDE_DEMO_CLIENT_TASKS, startOfToday } from "@/lib/tasks";
import { getUnreadThreadCount } from "@/lib/gmail";

const navLinks = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/prospection", label: "Prospection" },
  { href: "/admin/taches", label: "Tâches" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/notes", label: "Notes" },
  { href: "/admin/mails", label: "Mail" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/listes", label: "Listes" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/finances", label: "Finances" },
  { href: "/admin/planning", label: "Planning" },
  { href: "/admin/audit", label: "Audit" },
];

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await verifyAdminSession();

  // Chronomètre visible dans tout l'admin (pas seulement la fiche tâche) —
  // au plus une ligne `endedAt: null` à la fois PAR ADMIN, voir
  // `startTaskTimer` (chaque admin a son propre chrono, indépendant).
  const [runningEntry, overdueCount, toValidateCount, unreadCount, prospectReminderCount] =
    await Promise.all([
      db.taskTimeEntry.findFirst({
        where: { endedAt: null, startedByAdminId: admin.id },
        include: { task: true },
      }),
      // Même logique que les compteurs du tableau de bord — pastille sur
      // "Tâches" dans le nav pour voir d'un coup d'œil s'il y a des tâches qui
      // demandent une action, sans avoir à ouvrir la page.
      db.task.count({
        where: {
          ...EXCLUDE_DEMO_CLIENT_TASKS,
          archivedAt: null,
          dueDate: { lt: startOfToday() },
          status: { slug: { not: TASK_STATUS.TERMINE } },
        },
      }),
      db.task.count({
        where: { ...EXCLUDE_DEMO_CLIENT_TASKS, archivedAt: null, status: { slug: TASK_STATUS.A_VALIDER } },
      }),
      getUnreadThreadCount(),
      // Pastille "Prospection" — relances dues aujourd'hui ou en retard, pas
      // encore envoyées.
      db.prospect.count({
        where: { nextReminderAt: { lte: new Date() }, reminderSentAt: null },
      }),
    ]);
  const attentionCount = overdueCount + toValidateCount;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2">
            <BrandLogo className="h-7" />
            <span className="font-display text-lg font-semibold tracking-tight text-ink">
              — Admin
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <GlobalSearchBar />
            </div>
            {runningEntry && (
              <TimerHeaderWidget
                activeTimer={{
                  taskId: runningEntry.taskId,
                  taskTitle: runningEntry.task.title,
                  startedAt: runningEntry.startedAt.toISOString(),
                }}
              />
            )}
            <span className="hidden text-sm text-ink-muted sm:inline">{admin.email}</span>
            <Link
              href="/admin/reglages"
              aria-label="Réglages"
              className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <GearSix size={18} weight="regular" />
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          {navLinks.map((link) => {
            const badgeCount =
              link.href === "/admin/taches"
                ? attentionCount
                : link.href === "/admin/mails"
                  ? unreadCount
                  : link.href === "/admin/prospection"
                    ? prospectReminderCount
                    : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-muted transition-colors hover:text-ink"
              >
                {link.label}
                {badgeCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-ink">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
