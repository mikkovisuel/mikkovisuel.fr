"use client";

import { useTransition } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { setTaskStatus } from "@/lib/actions/tasks";
import { TASK_STATUS } from "@/lib/dropdown-lists";

// Raccourci pour l'action la plus fréquente sur une tâche (passer le BAT en
// attente de validation client) : équivalent à choisir "À valider" dans le
// sélecteur de statut, mais plus visible et explicite qu'un menu déroulant.
// Prévient automatiquement tous les profils du client par email (voir
// `setTaskStatus`/`notifyClientUsersOfNewTaskToValidate`) — désactivé une
// fois déjà "À valider" pour éviter un second envoi accidentel.
export function TaskValidationButton({
  taskId,
  currentSlug,
}: {
  taskId: string;
  currentSlug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const alreadyAwaitingValidation = currentSlug === TASK_STATUS.A_VALIDER;

  return (
    <button
      type="button"
      disabled={isPending || alreadyAwaitingValidation}
      onClick={() => startTransition(() => setTaskStatus(taskId, TASK_STATUS.A_VALIDER))}
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-ink"
    >
      <PaperPlaneTilt size={16} weight="regular" />
      {alreadyAwaitingValidation
        ? "Déjà en attente de validation"
        : isPending
          ? "Mise en validation..."
          : "Mettre en validation"}
    </button>
  );
}
