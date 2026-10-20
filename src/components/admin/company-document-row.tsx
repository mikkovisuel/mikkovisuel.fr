import { DownloadSimple, FileText, Trash } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteCompanyDocument } from "@/lib/actions/company-documents";
import { EditCompanyDocumentButton } from "@/components/admin/administratif-edit-dialogs";

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

const LABELLED_BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-sm text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

// Consultation/téléchargement/suppression (demande du 2026-07-31), plus
// la modification du nom, de la catégorie ou du fichier (2026-10-20) — pas de client, pas de montant, pas de statut : ces
// documents n'ont explicitement "pas d'affectation".
export function CompanyDocumentRow({
  document,
}: {
  document: { id: string; fileName: string; category: string; uploadedAt: Date };
}) {
  return (
    <div className="ws-row flex items-center justify-between gap-3 px-2">
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-2 font-medium text-ink">
          <FileText size={20} weight="fill" className="shrink-0 text-ink-muted" aria-hidden />
          <span className="truncate">{document.fileName}</span>
        </p>
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
        <EditCompanyDocumentButton document={document} />
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
