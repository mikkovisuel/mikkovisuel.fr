"use client";

import { useTransition } from "react";
import { Play, Stop } from "@phosphor-icons/react/dist/ssr";
import { startTaskTimer, stopActiveTimer } from "@/lib/actions/time-tracking";
import { LiveElapsed } from "@/components/admin/live-elapsed";

// Démarrer/arrêter le chronomètre depuis la fiche tâche — seul endroit
// prévu pour ça (pas de bouton rapide sur les listes). Démarrer ici arrête
// automatiquement le chrono d'une autre tâche s'il y en avait un en cours
// (voir `startTaskTimer`).
export function TaskTimerButton({
  taskId,
  activeEntry,
}: {
  taskId: string;
  activeEntry: { startedAt: string } | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (activeEntry) {
    return (
      <div className="inline-flex items-center gap-3 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm">
        <span className="font-mono tabular-nums text-ink">
          <LiveElapsed startedAt={activeEntry.startedAt} />
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => stopActiveTimer())}
          className="inline-flex items-center gap-1.5 text-ink-muted transition-colors hover:text-danger disabled:opacity-60"
        >
          <Stop size={14} weight="fill" />
          Arrêter
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => startTaskTimer(taskId))}
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
    >
      <Play size={16} weight="fill" />
      Démarrer le chronomètre
    </button>
  );
}
