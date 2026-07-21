"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Timer, Stop } from "@phosphor-icons/react/dist/ssr";
import { LiveElapsed } from "@/components/admin/live-elapsed";
import { stopActiveTimer } from "@/lib/actions/time-tracking";

// Rendu uniquement quand un chronomètre tourne (voir `admin/(protege)/
// layout.tsx`, qui ne passe `activeTimer` que dans ce cas) — pas de pastille
// "aucun chrono actif" pour garder le header sobre le reste du temps.
export function TimerHeaderWidget({
  activeTimer,
}: {
  activeTimer: { taskId: string; taskTitle: string; startedAt: string };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 py-1.5 pl-3 pr-1.5 text-sm">
      <Timer size={16} weight="fill" className="shrink-0 text-accent" />
      <Link
        href={`/admin/taches/${activeTimer.taskId}`}
        className="max-w-[10rem] truncate text-ink transition-colors hover:text-accent sm:max-w-[16rem]"
        title={activeTimer.taskTitle}
      >
        {activeTimer.taskTitle}
      </Link>
      <span className="shrink-0 font-mono tabular-nums text-ink-muted">
        <LiveElapsed startedAt={activeTimer.startedAt} />
      </span>
      <button
        type="button"
        aria-label="Arrêter le chronomètre"
        title="Arrêter le chronomètre"
        disabled={isPending}
        onClick={() => startTransition(() => stopActiveTimer())}
        className="shrink-0 rounded-full p-1.5 text-ink-muted transition-colors hover:bg-danger/15 hover:text-danger disabled:opacity-60"
      >
        <Stop size={14} weight="fill" />
      </button>
    </div>
  );
}
