"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import type { SearchResults } from "@/lib/global-search";

const GROUPS: { key: keyof SearchResults; label: string }[] = [
  { key: "clients", label: "Clients" },
  { key: "contacts", label: "Contacts" },
  { key: "tasks", label: "Tâches" },
  { key: "prospects", label: "Prospects" },
  { key: "documents", label: "Documents" },
];

export function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timeout = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: SearchResults | null) => setResults(data));
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasAnyResult = results
    ? GROUPS.some((group) => results[group.key].length > 0)
    : false;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface-elevated px-3 py-1.5">
        <MagnifyingGlass size={16} className="shrink-0 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-lg">
          {!results ? (
            <p className="px-3 py-2 text-sm text-ink-muted">Recherche...</p>
          ) : !hasAnyResult ? (
            <p className="px-3 py-2 text-sm text-ink-muted">Aucun résultat.</p>
          ) : (
            GROUPS.map((group) => {
              const items = results[group.key];
              if (items.length === 0) return null;
              return (
                <div key={group.key} className="mb-2 last:mb-0">
                  <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {group.label}
                  </p>
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-elevated"
                    >
                      {item.label}
                      {item.sublabel && (
                        <span className="ml-1.5 text-ink-muted">— {item.sublabel}</span>
                      )}
                    </Link>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
