import type { Metadata } from "next";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";
import { PayButton } from "@/components/client/pay-button";
import { AcceptDevisDialog } from "@/components/client/accept-devis-dialog";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";

const DEVIS_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const metadata: Metadata = {
  title: "Administratif — Espace client Mikko Visuel",
};

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amountCents / 100);
}

export default async function ClientAdministrativePage() {
  const clientUser = await verifyClientSession();
  const stripeEnabled = isStripeConfigured();

  // Paiements sans facture (2026-08-17, signalement client : "les impayés
  // non facturés ne remontent pas") — jusqu'ici PaymentRecord n'était visible
  // que côté admin (/admin/documents, Finances). Un acompte ou règlement
  // suivi sans document associé doit quand même apparaître au client comme
  // un encours, sinon il n'a aucune visibilité sur ce qu'il doit.
  const [documents, paymentRecords] = await Promise.all([
    db.document.findMany({
      where: { clientId: clientUser.clientId },
      include: { type: true },
      orderBy: { uploadedAt: "desc" },
    }),
    db.paymentRecord.findMany({
      where: { clientId: clientUser.clientId },
      orderBy: { date: "desc" },
    }),
  ]);

  const outstandingCents =
    documents
      .filter((doc) => doc.paymentStatus === "unpaid" && doc.amountCents !== null)
      .reduce((sum, doc) => sum + (doc.amountCents ?? 0), 0) +
    paymentRecords
      .filter((record) => record.paymentStatus === "unpaid")
      .reduce((sum, record) => sum + record.amountCents, 0);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Administratif</h1>
      <p className="mt-2 text-sm text-ink-muted">Vos devis, contrats et factures.</p>

      {outstandingCents > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-surface-elevated p-4">
          <p className="text-sm text-ink-muted">
            Encours de paiement :{" "}
            <span className="font-medium text-ink">{formatAmount(outstandingCents, "EUR")}</span>
          </p>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucun document pour le moment.</p>
      ) : (
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{doc.fileName}</p>
                  {doc.amountCents !== null && doc.paymentStatus !== "n/a" && (
                    <PaymentStatusBadge status={doc.paymentStatus === "paid" ? "paid" : "unpaid"} />
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {doc.type.label}
                  {doc.amountCents !== null && ` · ${formatAmount(doc.amountCents, doc.currency)}`}
                  {doc.paymentStatus === "unpaid" && !stripeEnabled &&
                    " · paiement en ligne bientôt disponible"}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2 self-start">
                  {doc.paymentStatus === "unpaid" && stripeEnabled && !clientUser.client.isDemo && (
                    <PayButton documentId={doc.id} />
                  )}
                  <a
                    href={`/api/fichiers/documents/${doc.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
                  >
                    <DownloadSimple size={16} weight="regular" />
                    Télécharger
                  </a>
                </div>
                {doc.type.slug === DOCUMENT_TYPE.DEVIS && !clientUser.client.isDemo && (
                  doc.acceptedAt ? (
                    <span className="text-xs text-ink-muted">
                      Accepté le {DEVIS_DATE_FORMATTER.format(doc.acceptedAt)} par {doc.acceptedByName}
                    </span>
                  ) : (
                    <AcceptDevisDialog documentId={doc.id} fileName={doc.fileName} />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {paymentRecords.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-lg font-medium text-ink">Autres paiements</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Acomptes ou règlements suivis sans document associé (virement, espèces...).
          </p>
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {paymentRecords.map((record) => (
              <div
                key={record.id}
                className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{record.label || "Paiement"}</p>
                    <PaymentStatusBadge status={record.paymentStatus === "paid" ? "paid" : "unpaid"} />
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatAmount(record.amountCents, record.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
