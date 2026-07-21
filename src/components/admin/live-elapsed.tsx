"use client";

import { useEffect, useState } from "react";
import { formatElapsedClock } from "@/lib/time-tracking";

// Texte de chronomètre qui avance tout seul (re-render chaque seconde),
// calculé depuis `startedAt` plutôt que compté localement — reste juste
// même après un changement d'onglet ou une veille de l'ordinateur.
export function LiveElapsed({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMs = now - new Date(startedAt).getTime();
  return <>{formatElapsedClock(elapsedMs)}</>;
}
