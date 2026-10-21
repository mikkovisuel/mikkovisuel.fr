"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// Fait descendre le calendrier jusqu'en bas de la zone de contenu, comme
// Google Agenda (demande du 2026-10-21 : « ne remplit pas l'écran »). Sur
// grand écran seulement : la zone `main` y défile seule, sa hauteur est
// connue. En dessous, la hauteur reste celle du contenu.
export function AgendaFill({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      const scroller = element.closest("main");
      if (window.innerWidth < 1024 || !scroller) {
        element.style.height = "";
        return;
      }
      const top = element.getBoundingClientRect().top + scroller.scrollTop;
      const available = scroller.getBoundingClientRect().bottom - top - 24;
      element.style.height = `${Math.max(480, available)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
