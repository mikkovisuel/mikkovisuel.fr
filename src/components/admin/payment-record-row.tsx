import Link from "next/link";
import { CurrencyCircleDollar, Trash } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { PaymentRecordDateField } from "@/components/admin/payment-record-date-field";
import { setPaymentRecordStatus, deletePaymentRecord } from "@/lib/actions/payment-records";
import { formatAmount } from "@/lib/documents";

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

// Suivi de paiement sans document (demande du 2026-07-31) : Client /
// montant / état / suppression, avec "marquer comme payé" en icône —
// cohérent avec `DocumentRow`, jamais en bouton texte.
export function PaymentRecordRow({
  record,
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
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
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
      <div className="flex shrink-0 items-center gap-2">
        <form
          action={setPaymentRecordStatus.bind(
            null,
            record.id,
            record.paymentStatus === "paid" ? "unpaid" : "paid",
          )}
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
        <DeleteButton
          action={deletePaymentRecord.bind(null, record.id)}
          confirmMessage={`Supprimer ce suivi de paiement pour ${record.clientName} ?`}
          label="Supprimer"
          icon={<Trash size={16} weight="regular" />}
          className={`${ICON_BUTTON} hover:border-danger hover:bg-danger hover:text-white`}
        />
      </div>
    </div>
  );
}
