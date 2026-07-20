import { PushPin } from "@phosphor-icons/react/dist/ssr";
import { toggleTaskPin } from "@/lib/actions/tasks";

// Bascule une pastille au clic, pas de confirmation — l'épinglage est
// volontairement réversible sans friction. Formulaire natif (pas de state
// client) pour rester cohérent avec les autres actions rapides du projet
// (ex. "Marquer comme payée").
export function TaskPinButton({ taskId, pinned }: { taskId: string; pinned: boolean }) {
  return (
    <form action={toggleTaskPin.bind(null, taskId)}>
      <button
        type="submit"
        aria-label={pinned ? "Désépingler la tâche" : "Épingler la tâche"}
        title={pinned ? "Désépingler" : "Épingler"}
        className={`shrink-0 rounded-full p-1 transition-colors ${
          pinned ? "text-accent" : "text-ink-muted hover:text-ink"
        }`}
      >
        <PushPin size={16} weight={pinned ? "fill" : "regular"} />
      </button>
    </form>
  );
}
