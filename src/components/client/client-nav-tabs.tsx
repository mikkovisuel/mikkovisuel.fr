"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavTab {
  href: string;
  label: string;
  count?: number;
}

export function ClientNavTabs({ tabs }: { tabs: NavTab[] }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8">
      {tabs.map((tab) => {
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
