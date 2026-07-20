"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

interface NavTab {
  href: string;
  label: string;
  count?: number;
  // Lien externe (ex. dossier Google Drive du client) : ouvert dans un
  // nouvel onglet, jamais surligné comme "actif" (le pathname interne ne
  // matchera jamais son href).
  external?: boolean;
}

export function ClientNavTabs({ tabs }: { tabs: NavTab[] }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8">
      {tabs.map((tab) => {
        if (tab.external) {
          return (
            <a
              key={tab.href}
              href={tab.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent py-3 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {tab.label}
              <ArrowSquareOut size={14} weight="regular" />
            </a>
          );
        }

        // "/espace-client" ne doit être actif que sur la page exacte, sinon
        // il resterait allumé sur tous les autres onglets (tous préfixés par
        // /espace-client/...).
        const isActive = tab.href === "/espace-client" ? pathname === tab.href : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 py-3 text-sm transition-colors ${
              isActive ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {!!tab.count && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-ink">
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
