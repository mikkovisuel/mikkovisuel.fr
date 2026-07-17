"use client";

import { useEffect, useState, useTransition } from "react";
import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { updateThemePreference } from "@/lib/actions/theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Theme is decided by an inline script before hydration (see layout.tsx) to avoid
    // a flash of the wrong theme, so the real value can only be read once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
    // Persists to the logged-in account (if any) so the preference follows
    // the user across devices; no-ops beyond the cookie when logged out.
    startTransition(() => {
      updateThemePreference(next ? "dark" : "light");
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
    >
      {isDark === null ? null : isDark ? (
        <Sun size={18} weight="regular" />
      ) : (
        <Moon size={18} weight="regular" />
      )}
    </button>
  );
}
