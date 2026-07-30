import { DownloadSimple, PaperPlaneTilt, PencilSimpleLine } from "@phosphor-icons/react/dist/ssr";
import {
  setDocumentPaymentStatus,
  sendPaymentReminder,
  sendDocumentByEmail,
} from "@/lib/actions/payments";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatAmount, isOverdue, dueDateFormatter } from "@/lib/documents";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { buildDocumentMailDraft } from "@/lib/mail-draft";

const SENT_AT_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface DocumentRowProps {
  document: {
    id: string;
    fileName: string;
    amountCents: number | null;
    currency: string;
    paymentStatus: string;
    dueDate: Date | null;
    sentAt: Date | null;
    acceptedAt?: Date | null;
    acceptedByName?: string | null;
    type: { label: string; slug?: string };
    client?: { name: string };
  };
  showClient?: boolean;
  // Email de facturation du client concerné — passé explicitement plutôt
  // que lu depuis `document.client` : la fiche client (qui n'inclut pas la
  // relation `client` sur chaque document, déjà dans son contexte) et la
  // liste globale des documents (qui l'inclut) n'ont pas la même forme de
  // données en entrée.
  billingEmail?: string | null;
  deleteAction?: (id: string) => Promise<void>;
}

export function DocumentRow({
  document,
  showClient = false,
  billingEmail,
  deleteAction,
}: DocumentRowProps) {
  const overdue = isOverdue(document);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-ink">{document.fileName}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {showClient && document.client && `${document.client.name} · `}
          {document.type.label}
          {document.amountCents !== null &&
            ` · ${formatAmount(document.amountCents, document.currency)}`}
          {document.paymentStatus === "unpaid" && " · en attente de paiement"}
          {document.paymentStatus === "paid" && " · payée"}
          {document.dueDate && ` · échéance le ${dueDateFormatter.format(document.dueDate)}`}
        </p>
        {overdue && <p className="mt-1 text-sm font-medium text-danger">En retard</p>}
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <PaperPlaneTilt
            size={14}
            weight={document.sentAt ? "fill" : "regular"}
            className={document.sentAt ? "text-accent" : "text-ink-muted"}
          />
          {document.sentAt
            ? `Envoyé le ${SENT_AT_FORMATTER.format(document.sentAt)}`
            : "Non envoyé"}
        </p>
        {document.type.slug === DOCUMENT_TYPE.DEVIS && document.acceptedAt && (
          <p className="mt-1 text-sm text-accent">
            Accepté et signé le {SENT_AT_FORMATTER.format(document.acceptedAt)}
            {document.acceptedByName && ` par ${document.acceptedByName}`}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {document.amountCents !== null && (
          <form
            action={setDocumentPaymentStatus.bind(
              null,
              document.id,
              document.paymentStatus === "paid" ? "unpaid" : "paid",
            )}
          >
            <button
              type="submit"
              className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
            >
              {document.paymentStatus === "paid" ? "Marquer comme impayée" : "Marquer comme payée"}
            </button>
          </form>
        )}
        {document.paymentStatus === "unpaid" && (
          <form action={sendPaymentReminder.bind(null, document.id)}>
            <button
              type="submit"
              className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
            >
              Envoyer une relance
            </button>
          </form>
        )}
        {billingEmail ? (
          <>
            <form action={sendDocumentByEmail.bind(null, document.id)}>
              <button
                type="submit"
                className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
              >
                Envoyer le document
              </button>
            </form>
            {/* Ouvre la messagerie de l'admin avec un brouillon prérempli —
                sans pièce jointe, impossible en `mailto:` (voir
                src/lib/mail-draft.ts). Ne marque donc pas `sentAt`. */}
            <a
              href={buildDocumentMailDraft({
                to: billingEmail,
                fileName: document.fileName,
              })}
              className="inline-flex items-center gap-2 self-start rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
            >
              <PencilSimpleLine size={16} weight="regular" />
              Préparer le mail
            </a>
          </>
        ) : (
          <span className="text-xs text-ink-muted">
            Ajoutez un email de facturation pour envoyer ce document
          </span>
        )}
        <a
          href={`/api/fichiers/documents/${document.id}`}
          className="inline-flex items-center gap-2 self-start rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
        >
          <DownloadSimple size={16} weight="regular" />
          Télécharger
        </a>
        {deleteAction && (
          <DeleteButton
            action={deleteAction.bind(null, document.id)}
            confirmMessage={`Supprimer définitivement "${document.fileName}" ? Le fichier sera effacé du stockage et ne pourra pas être récupéré.`}
          />
        )}
      </div>
    </div>
  );
}
