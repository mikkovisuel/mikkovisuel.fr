import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimerHeaderWidget } from "@/components/admin/timer-header-widget";

const navLinks = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/taches", label: "Tâches" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/notes", label: "Notes" },
  { href: "/admin/mails", label: "Mail" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/listes", label: "Listes" },
  { href: "/admin/exports", label: "Exports" },
];

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await verifyAdminSession();

  // Chronomètre visible dans tout l'admin (pas seulement la fiche tâche) —
  // au plus une ligne `endedAt: null` à la fois, voir `startTaskTimer`.
  const runningEntry = await db.taskTimeEntry.findFirst({
    where: { endedAt: null },
    include: { task: true },
  });

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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
