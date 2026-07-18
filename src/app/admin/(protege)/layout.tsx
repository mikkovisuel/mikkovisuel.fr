import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

// Distinct from the client-facing manifest (see app/manifest.ts): only
// linked on /admin/* pages, so "Add to Home Screen" here installs the
// admin dashboard, not the client space.
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon-admin.png",
  },
  appleWebApp: {
    title: "Mikko Admin",
    statusBarStyle: "default",
  },
};

const navLinks = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/taches", label: "Tâches" },
  { href: "/admin/documents", label: "Documents" },
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
            <span className="hidden text-sm text-ink-muted sm:inline">{admin.email}</span>
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
