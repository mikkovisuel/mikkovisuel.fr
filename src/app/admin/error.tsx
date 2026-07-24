"use client";

import { useEffect } from "react";
import Link from "next/link";

// Filet de sécurité pour tout le sous-arbre /admin : sans ce fichier, une
// exception non gérée (ex. un échec d'upload avant le correctif try/catch
// dans src/lib/actions/files.ts) faisait planter Next.js sur son écran
// d'erreur générique par défaut (page blanche), au lieu d'un message
// compréhensible avec un moyen de revenir en arrière.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
      <h1 className="font-display text-xl font-medium text-ink">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-ink-muted">
        Quelque chose s&apos;est mal passé (fichier trop lourd, connexion interrompue...).
        Réessayez, ou revenez au tableau de bord.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Réessayer
        </button>
        <Link
          href="/admin"
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
        >
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
