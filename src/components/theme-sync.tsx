"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The no-flash script in layout.tsx only runs on a hard page load. Server
// Action redirects (e.g. right after login) are client-side transitions, so
// if the account's saved theme differs from whatever was on screen pre-login,
// the class would otherwise lag until a hard refresh. This re-syncs the
// class from the theme cookie (set authoritatively at login) on every route
// change; it's a no-op whenever they already match.
export function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )theme=(light|dark)/);
    if (!match) return;
    document.documentElement.classList.toggle("dark", match[1] === "dark");
  }, [pathname]);

  return null;
}
