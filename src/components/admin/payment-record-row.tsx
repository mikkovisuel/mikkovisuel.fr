import Link from "next/link";
import { CurrencyCircleDollar, Trash } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { PaymentRecordDateField } from "@/components/admin/payment-record-date-field";
import { setPaymentRecordStatus, deletePaymentRecord } from "@/lib/actions/payment-records";
import { formatAmount } from "@/lib/documents";
import { EditPaymentRecordButton } from "@/components/admin/administratif-edit-dialogs";

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

// Suivi de paiement sans document (demande du 2026-07-31) : Client /
// montant / état / suppression, avec "marquer comme payé" en icône —
// cohérent avec `DocumentRow`, jamais en bouton texte.
export function PaymentRecordRow({
  record,
  editClients,
  inCard = false,
}: {
  record: {
    id: string;
    clientId: string;
    clientName: string;
    label: string | null;
    amountCents: number;
    currency: string;
    paymentStatus: string;
    /** Format ISO `yyyy-mm-dd`, pour l'input date. */
    date: string;
  };
  /** Clients proposés par « Modifier » (2026-10-20). Absent : pas de bouton. */
  editClients?: { id: string; name: string }[];
  /** Dans la carte de la fiche client (2026-10-20, « s'affiche pas très
   * bien ») : une seule ligne, sans le nom du client (c'est sa fiche) ni les
   * marges de bord de page. */
  inCard?: boolean;
}) {
  const actions = (
    <>
      <form
        action={setPaymentRecordStatus.bind(null, record.id, record.paymentStatus === "paid" ? "unpaid" : "paid")}
      >
        <button
          type="submit"
          title={record.paymentStatus === "paid" ? "Marquer comme impayé" : "Marquer comme payé"}
          aria-label={record.paymentStatus === "paid" ? "Marquer comme impayé" : "Marquer comme payé"}
          className={ICON_BUTTON}
        >
          <CurrencyCircleDollar size={16} weight={record.paymentStatus === "paid" ? "fill" : "regular"} />
        </button>
      </form>
      {editClients && <EditPaymentRecordButton record={record} clients={editClients} />}
      <DeleteButton
        action={deletePaymentRecord.bind(null, record.id)}
        confirmMessage={`Supprimer ce suivi de paiement pour ${record.clientName} ?`}
        label="Supprimer"
        icon={<Trash size={16} weight="regular" />}
        className={`${ICON_BUTTON} hover:border-danger hover:bg-danger hover:text-white`}
      />
    </>
  );

  if (inCard) {
    return (
      <div className="ws-row group flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{record.label || "Paiement"}</span>
        <span className="text-sm tabular-nums text-ink">{formatAmount(record.amountCents, record.currency)}</span>
        <PaymentStatusBadge status={record.paymentStatus === "paid" ? "paid" : "unpaid"} />
        <PaymentRecordDateField recordId={record.id} date={record.date} />
        <div className="flex shrink-0 items-center gap-1 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 [&_.rounded-full]:border-transparent">
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div className="ws-row flex flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8 2xl:px-12">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/clients/${record.clientId}`}
            className="font-medium text-ink transition-colors hover:text-accent"
          >
            {record.clientName}
          </Link>
          <PaymentStatusBadge status={record.paymentStatus === "paid" ? "paid" : "unpaid"} />
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">
          {record.label && `${record.label} · `}
          {formatAmount(record.amountCents, record.currency)}
        </p>
        <div className="mt-1.5">
          <PaymentRecordDateField recordId={record.id} date={record.date} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}
