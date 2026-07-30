import { Archive, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { toggleClientArchived } from "@/lib/actions/clients";

// Pas de confirmation : l'archivage est réversible d'un clic et ne détruit
// rien — contrairement à la suppression définitive juste à côté, qui passe
// elle par une reconfirmation du mot de passe admin (`StepUpButton`).
export function ClientArchiveButton({
  clientId,
  archived,
}: {
  clientId: string;
  archived: boolean;
}) {
  return (
    <form action={toggleClientArchived.bind(null, clientId)}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
        title={
          archived
            ? "Remettre ce client dans les listes de travail"
            : "Sortir ce client des listes et sélecteurs, sans rien supprimer"
        }
      >
        {archived ? (
          <ArrowCounterClockwise size={16} weight="regular" />
        ) : (
          <Archive size={16} weight="regular" />
        )}
        {archived ? "Désarchiver" : "Archiver"}
      </button>
    </form>
  );
}
