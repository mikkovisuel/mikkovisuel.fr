"use client";

import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react/dist/ssr";

// Modale bâtie sur `<dialog showModal()>` natif plutôt qu'un `<div>` en
// position fixe : le navigateur fournit le piégeage du focus, la fermeture à
// Échap, l'inertie du reste de la page et le rôle ARIA. Rien à réimplémenter,
// et le comportement clavier reste correct.
//
// Le formulaire vit dans `children` : chaque appelant gère lui-même sa
// fermeture après succès (voir NewContactButton / NewTaskButton).
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      // `close` couvre aussi Échap et la fermeture native, pas seulement le
      // bouton — sans ça l'état React resterait "ouvert" après un Échap et il
      // faudrait cliquer deux fois pour rouvrir.
      onClose={onClose}
      // Clic sur le fond (la zone du `<dialog>` hors de son contenu) : ferme,
      // comme attendu d'une modale.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[min(48rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-full border border-line p-1.5 text-ink-muted transition-colors hover:border-accent hover:text-ink"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-6">{children}</div>
    </dialog>
  );
}
