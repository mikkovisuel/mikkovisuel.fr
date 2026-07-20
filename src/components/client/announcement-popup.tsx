"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mikko-announcement-dismissed";

// Pop-up d'annonce admin (case à cocher + texte dans /admin/reglages),
// affichée une fois par message et par onglet. La clé sessionStorage inclut
// le message lui-même : si l'admin change le texte, un nouveau message
// s'affiche même si le précédent avait été fermé — pas besoin d'une table
// d'accusés de lecture en base pour ça.
export function AnnouncementPopup({ message }: { message: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // sessionStorage n'est lisible qu'une fois monté côté client (comme le
    // thème dans ThemeToggle) — impossible de connaître la valeur pendant
    // le rendu serveur.
    const dismissed = window.sessionStorage.getItem(STORAGE_KEY);
    if (dismissed !== message) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, [message]);

  function dismiss() {
    window.sessionStorage.setItem(STORAGE_KEY, message);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={dismiss}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-w-sm rounded-2xl border border-line bg-surface-elevated p-6 shadow-xl"
      >
        <p className="whitespace-pre-wrap text-sm text-ink">{message}</p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
