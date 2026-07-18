import Link from "next/link";
import { cookies } from "next/headers";
import { Gear } from "@phosphor-icons/react/dist/ssr";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClientNavTabs } from "@/components/client/client-nav-tabs";
import { ImpersonationBanner } from "@/components/client/impersonation-banner";

export default async function ClientProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clientUser = await verifyClientSession();
  const cookieStore = await cookies();
  const isImpersonating = cookieStore.has("admin_return_token");

  const [toValidateCount, unpaidCount] = await Promise.all([
    db.task.count({
      where: { clientId: clientUser.clientId, archivedAt: null, status: { slug: TASK_STATUS.A_VALIDER } },
    }),
    db.document.count({ where: { clientId: clientUser.clientId, paymentStatus: "unpaid" } }),
  ]);

  const tabs = [
    { href: "/espace-client", label: "Accueil" },
    { href: "/espace-client/a-valider", label: "À valider", count: toValidateCount },
    { href: "/espace-client/suivi", label: "Suivi" },
    { href: "/espace-client/calendrier", label: "Calendrier" },
    { href: "/espace-client/livrables", label: "Livrables" },
    { href: "/espace-client/administratif", label: "Administratif", count: unpaidCount },
    { href: "/espace-client/suggestion", label: "Suggestion" },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {isImpersonating && <ImpersonationBanner clientName={clientUser.client.name} />}
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/espace-client">
            <BrandLogo className="h-7" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink-muted sm:inline">
              {clientUser.client.name}
            </span>
            <Link
              href="/espace-client/compte"
              aria-label="Mon compte"
              className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <Gear size={18} weight="regular" />
            </Link>
            <ThemeToggle />
            <Link
              href="/espace-client/nouvelle-demande"
              className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
            >
              Nouvelle demande
            </Link>
            <LogoutButton />
          </div>
        </div>
        <ClientNavTabs tabs={tabs} />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
