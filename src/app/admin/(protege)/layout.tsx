import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimerHeaderWidget } from "@/components/admin/timer-header-widget";
import { GlobalSearchBar } from "@/components/admin/global-search-bar";
import { SettingsMenu } from "@/components/admin/settings-menu";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { ACTIVE_TASKS } from "@/lib/tasks";

// "Listes", "Exports" et "Audit" ont été retirés d'ici le 2026-07-31 et
// déplacés sous la roue crantée (voir `SettingsMenu`) : ce sont des écrans
// de paramétrage ou de consultation ponctuelle, alors que cette barre est
// le travail quotidien. 13 onglets -> 10. "Facturation" ajouté le
// 2026-09-02 (10 -> 11), puis "Facturation" et "Finances" retirés le
// 2026-09-06 (demande explicite) et fusionnés dans "Documents" : 11 -> 9.
const navLinks = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/prospection", label: "Prospection" },
  { href: "/admin/taches", label: "Tâches" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/notes", label: "Notes" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/planning", label: "Planning" },
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
  const [runningEntry, openTaskCount, prospectReminderCount] = await Promise.all([
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
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl 2xl:max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
            <SettingsMenu />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl 2xl:max-w-[100rem] gap-6 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          {navLinks.map((link) => {
            const badgeCount =
              link.href === "/admin/taches"
                ? openTaskCount
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
