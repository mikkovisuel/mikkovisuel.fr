import { Play, Stop } from "@phosphor-icons/react/dist/ssr";
import { startTaskTimer, stopActiveTimer } from "@/lib/actions/time-tracking";

// Version compacte (icône seule) de `TaskTimerButton`, pour démarrer/
// arrêter le chronomètre directement depuis la vue Liste sans ouvrir la
// fiche tâche. Même règle qu'ailleurs : démarrer ici arrête automatiquement
// le chrono d'une autre tâche s'il y en avait un en cours (un seul admin,
// un seul chrono actif à la fois — voir `startTaskTimer`).
export function TaskTimerIconButton({
  taskId,
  isRunning,
}: {
  taskId: string;
  isRunning: boolean;
}) {
  if (isRunning) {
    return (
      <form action={stopActiveTimer}>
        <button
          type="submit"
          aria-label="Arrêter le chronomètre"
          title="Arrêter le chronomètre"
          className="shrink-0 rounded-full p-1 text-accent transition-colors hover:text-danger"
        >
          <Stop size={16} weight="fill" />
        </button>
      </form>
    );
  }

  return (
    <form action={startTaskTimer.bind(null, taskId)}>
      <button
        type="submit"
        aria-label="Démarrer le chronomètre"
        title="Démarrer le chronomètre"
        className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:text-ink"
      >
        <Play size={16} weight="regular" />
      </button>
    </form>
  );
}
