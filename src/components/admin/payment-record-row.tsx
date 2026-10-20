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
  const actions = <PaymentRecordActions record={record} editClients={editClients} />;

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

type PaymentRecord = Parameters<typeof PaymentRecordRow>[0]["record"];

/** Commandes d'un paiement (payé / impayé, modifier, supprimer), partagées
 * par la ligne et par le tableau de la page Administratif. */
export function PaymentRecordActions({
  record,
  editClients,
}: {
  record: PaymentRecord;
  editClients?: { id: string; name: string }[];
}) {
  return (
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
}

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Paiements sans facture de la page Administratif, en tableau façon Drive
 * comme les factures juste au-dessus (2026-10-20, « revoir l'affichage des
 * paiements sans facture ») : Client / Libellé / Montant / Statut / Date,
 * commandes au survol. Sur téléphone, les lignes d'avant restent. */
export function PaymentRecordsTable({
  records,
  editClients,
}: {
  records: PaymentRecord[];
  editClients?: { id: string; name: string }[];
}) {
  return (
    <>
      <div className="-mx-4 mt-4 divide-y divide-line border-y border-line sm:hidden">
        {records.map((record) => (
          <PaymentRecordRow key={record.id} record={record} editClients={editClients} />
        ))}
      </div>
      <div className="-mx-4 mt-4 hidden overflow-x-auto border-y border-line sm:-mx-6 sm:block lg:-mx-8 2xl:-mx-12">
        <table className="ws-list w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-ink-muted">
              <th className="py-2 pl-4 pr-4 font-medium sm:pl-6 lg:pl-8 2xl:pl-12">Client</th>
              <th className="px-4 py-2 font-medium">Libellé</th>
              <th className="px-4 py-2 text-right font-medium">Montant</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="py-2 pr-4 sm:pr-6 lg:pr-8 2xl:pr-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.map((record) => {
              const paid = record.paymentStatus === "paid";
              return (
                <tr key={record.id} className="group">
                  <td className="py-2 pl-4 pr-4 sm:pl-6 lg:pl-8 2xl:pl-12">
                    <Link href={`/admin/clients/${record.clientId}`} className="font-medium text-ink hover:underline">
                      {record.clientName}
                    </Link>
                  </td>
                  <td className="max-w-[18rem] truncate px-4 py-2 text-ink-muted">{record.label || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-ink">
                    {formatAmount(record.amountCents, record.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span className="inline-flex items-center gap-2 text-ink">
                      <span className={`h-2 w-2 rounded-full ${paid ? "bg-emerald-600" : "bg-orange-500"}`} />
                      {paid ? "Payé" : "En attente"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-ink-muted">
                    {DATE.format(new Date(`${record.date}T12:00:00`))}
                  </td>
                  <td className="py-1 pr-4 sm:pr-6 lg:pr-8 2xl:pr-12">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [&_.rounded-full]:border-transparent">
                      <PaymentRecordActions record={record} editClients={editClients} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
