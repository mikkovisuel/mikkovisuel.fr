"use client";

import { useFormStatus } from "react-dom";
import { ShareNetwork } from "@phosphor-icons/react/dist/ssr";

function SubmitButton({ mediaCount }: { mediaCount: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
    >
      <ShareNetwork size={16} weight="regular" />
      {pending ? "Création..." : `Créer une publication réseaux sociaux (${mediaCount} visuel${mediaCount > 1 ? "s" : ""})`}
    </button>
  );
}

// Bouton de la fiche tâche (livraison 2 du module Community management) :
// les livrables finaux image/vidéo deviennent le brouillon d'une
// publication, sans ressaisie. Sans champ à saisir, donc pas concerné par
// la réinitialisation des formulaires (voir src/lib/use-form-submit.ts).
export function CreatePostFromTaskButton({
  action,
  mediaCount,
}: {
  action: () => Promise<void>;
  mediaCount: number;
}) {
  return (
    <form action={action}>
      <SubmitButton mediaCount={mediaCount} />
    </form>
  );
}
