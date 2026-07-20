import { Paperclip, FileArrowDown } from "@phosphor-icons/react/dist/ssr";

// Pastille compacte indiquant qu'une tâche a des pièces jointes et/ou des
// livrables, pour les vues résumées (tableau, cartes Kanban, liste par
// client...) qui n'affichent pas les fichiers eux-mêmes. Rien n'est rendu
// si les deux compteurs sont à zéro.
export function AttachmentBadge({
  attachmentCount = 0,
  deliverableCount = 0,
}: {
  attachmentCount?: number;
  deliverableCount?: number;
}) {
  if (attachmentCount === 0 && deliverableCount === 0) return null;

  return (
    <span className="inline-flex items-center gap-2 text-ink-muted">
      {attachmentCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5"
          title={`${attachmentCount} pièce${attachmentCount > 1 ? "s" : ""} jointe${attachmentCount > 1 ? "s" : ""}`}
        >
          <Paperclip size={13} weight="regular" />
          <span className="text-xs">{attachmentCount}</span>
        </span>
      )}
      {deliverableCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5"
          title={`${deliverableCount} livrable${deliverableCount > 1 ? "s" : ""}`}
        >
          <FileArrowDown size={13} weight="regular" />
          <span className="text-xs">{deliverableCount}</span>
        </span>
      )}
    </span>
  );
}
