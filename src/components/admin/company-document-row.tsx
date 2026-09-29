import { DownloadSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteCompanyDocument } from "@/lib/actions/company-documents";

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

const LABELLED_BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-sm text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

// Consultation/téléchargement/suppression uniquement (demande du
// 2026-07-31) — pas de client, pas de montant, pas de statut : ces
// documents n'ont explicitement "pas d'affectation".
export function CompanyDocumentRow({
  document,
}: {
  document: { id: string; fileName: string; uploadedAt: Date };
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{document.fileName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={`/api/fichiers/documents-societe/${document.id}`}
          download={document.fileName}
          className={LABELLED_BUTTON}
        >
          <DownloadSimple size={16} weight="regular" />
          Télécharger
        </a>
        <DeleteButton
          action={deleteCompanyDocument.bind(null, document.id)}
          confirmMessage={`Supprimer définitivement "${document.fileName}" ?`}
          label="Supprimer"
          icon={<Trash size={16} weight="regular" />}
          className={`${ICON_BUTTON} hover:border-danger hover:bg-danger hover:text-white`}
        />
      </div>
    </div>
  );
}
