import {
  DownloadSimple,
  PaperPlaneTilt,
  PencilSimpleLine,
  CurrencyCircleDollar,
  BellSimple,
  Trash,
} from "@phosphor-icons/react/dist/ssr";
import { setDocumentPaymentStatus, sendPaymentReminder } from "@/lib/actions/payments";
import { DeleteButton } from "@/components/admin/delete-button";
import { SendDocumentDialog } from "@/components/admin/send-document-dialog";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { formatAmount, isOverdue, dueDateFormatter } from "@/lib/documents";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { buildDocumentMailDraft } from "@/lib/mail-draft";
import {
  DEFAULT_DOCUMENT_SENT_SUBJECT,
  DEFAULT_DOCUMENT_SENT_BODY,
} from "@/lib/invoice-email-templates";

const SENT_AT_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

interface DocumentRowProps {
  document: {
    id: string;
    clientId: string;
    fileName: string;
    amountCents: number | null;
    currency: string;
    paymentStatus: string;
    dueDate: Date | null;
    sentAt: Date | null;
    acceptedAt?: Date | null;
    acceptedByName?: string | null;
    isMonthlyInvoice?: boolean;
    invoiceYear?: number | null;
    invoiceMonth?: number | null;
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
  // Aperçu + pièces jointes avant envoi (2026-09-08) — voir
  // `SendDocumentDialog`. Modèles déjà résolus (personnalisé ou texte fixe
  // par défaut, voir invoice-email-templates.ts) plutôt que les réglages
  // bruts : ce composant n'a pas à connaître la logique de repli.
  companyDocuments?: { id: string; fileName: string }[];
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
}

// Toutes les actions sont passées en icônes (demande du 2026-07-31) — la
// version précédente alignait 4 à 5 boutons texte, qui débordaient sur
// plusieurs lignes dès qu'un document avait un montant et un email de
// facturation. Tient désormais sur une seule ligne à partir de `sm`.
export function DocumentRow({
  document,
  showClient = false,
  billingEmail,
  deleteAction,
  companyDocuments = [],
  emailSubjectTemplate = DEFAULT_DOCUMENT_SENT_SUBJECT,
  emailBodyTemplate = DEFAULT_DOCUMENT_SENT_BODY,
}: DocumentRowProps) {
  const overdue = isOverdue(document);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">{document.fileName}</p>
          {document.amountCents !== null && document.paymentStatus !== "n/a" && (
            <PaymentStatusBadge status={document.paymentStatus === "paid" ? "paid" : "unpaid"} />
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {showClient && document.client && `${document.client.name} · `}
          {document.type.label}
          {document.amountCents !== null &&
            ` · ${formatAmount(document.amountCents, document.currency)}`}
          {document.dueDate && ` · échéance le ${dueDateFormatter.format(document.dueDate)}`}
          {document.isMonthlyInvoice && document.invoiceYear && document.invoiceMonth && (
            <>
              {" · mensuelle "}
              {String(document.invoiceMonth).padStart(2, "0")}/{document.invoiceYear}
            </>
          )}
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
      <div className="flex shrink-0 flex-wrap items-center gap-2">
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
              title={document.paymentStatus === "paid" ? "Marquer comme impayée" : "Marquer comme payée"}
              aria-label={document.paymentStatus === "paid" ? "Marquer comme impayée" : "Marquer comme payée"}
              className={ICON_BUTTON}
            >
              <CurrencyCircleDollar size={16} weight={document.paymentStatus === "paid" ? "fill" : "regular"} />
            </button>
          </form>
        )}
        {document.paymentStatus === "unpaid" && (
          <form action={sendPaymentReminder.bind(null, document.id)}>
            <button type="submit" title="Envoyer une relance" aria-label="Envoyer une relance" className={ICON_BUTTON}>
              <BellSimple size={16} weight="regular" />
            </button>
          </form>
        )}
        {billingEmail ? (
          <>
            <SendDocumentDialog
              documentId={document.id}
              fileName={document.fileName}
              billingEmail={billingEmail}
              clientId={document.clientId}
              emailSubjectTemplate={emailSubjectTemplate}
              emailBodyTemplate={emailBodyTemplate}
              companyDocuments={companyDocuments}
            />
            {/* Ouvre la messagerie de l'admin avec un brouillon prérempli —
                sans pièce jointe, impossible en `mailto:` (voir
                src/lib/mail-draft.ts). Ne marque donc pas `sentAt`. */}
            <a
              href={buildDocumentMailDraft({ to: billingEmail, fileName: document.fileName })}
              title="Préparer le mail"
              aria-label="Préparer le mail"
              className={ICON_BUTTON}
            >
              <PencilSimpleLine size={16} weight="regular" />
            </a>
          </>
        ) : (
          <span className="text-xs text-ink-muted">Pas d&apos;email de facturation</span>
        )}
        <a
          href={`/api/fichiers/documents/${document.id}`}
          title="Télécharger"
          aria-label="Télécharger"
          className={ICON_BUTTON}
        >
          <DownloadSimple size={16} weight="regular" />
        </a>
        {deleteAction && (
          <DeleteButton
            action={deleteAction.bind(null, document.id)}
            confirmMessage={`Supprimer définitivement "${document.fileName}" ? Le fichier sera effacé du stockage et ne pourra pas être récupéré.`}
            label="Supprimer"
            icon={<Trash size={16} weight="regular" />}
            className={`${ICON_BUTTON} hover:border-danger hover:bg-danger hover:text-white`}
          />
        )}
      </div>
    </div>
  );
}
