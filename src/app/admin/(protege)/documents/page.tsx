import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { NewDocumentButton } from "@/components/admin/new-document-button";
import { DocumentRow } from "@/components/admin/document-row";
import { DocumentBinView } from "@/components/admin/document-bin-view";
import { CompanyDocumentUploadForm } from "@/components/admin/company-document-upload-form";
import { CompanyDocumentRow } from "@/components/admin/company-document-row";
import { PaymentRecordForm } from "@/components/admin/payment-record-form";
import { PaymentRecordRow } from "@/components/admin/payment-record-row";
import { FilterMenu } from "@/components/admin/filter-menu";
import { deleteDocument } from "@/lib/actions/files";
import { DOCUMENT_TYPE_LIST_KEY, COMPANY_DOCUMENT_CATEGORY, COMPANY_DOCUMENT_CATEGORY_LABELS } from "@/lib/dropdown-lists";
import { formatAmount } from "@/lib/documents";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { Pagination } from "@/components/admin/pagination";

export const metadata: Metadata = {
  title: "Documents — Admin Mikko Visuel",
};

const STATUS_OPTIONS = [
  { value: "unpaid", label: "En attente de paiement" },
  { value: "paid", label: "Payée" },
  { value: "n/a", label: "Sans montant" },
];

// Pagination (2026-08-24, suite au signalement de lenteur) : uniquement en
// vue "Détaillé" — la vue "Bacs" a besoin de l'ensemble des documents pour
// son regroupement par type.
const PAGE_SIZE = 30;

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    typeId?: string;
    status?: string;
    vue?: string;
    page?: string;
  }>;
}) {
  await verifyAdminSession();
  const { clientId, typeId, status, vue, page } = await searchParams;
  const isBinView = vue === "bacs";
  const currentPage = Math.max(1, Number(page) || 1);

  const documentWhere = {
    ...(clientId ? { clientId } : {}),
    ...(typeId ? { typeId } : {}),
    ...(status ? { paymentStatus: status } : {}),
  };

  const [documents, documentCount, outstandingDocuments, clients, typeList, companyDocuments, paymentRecords] =
    await Promise.all([
      db.document.findMany({
        where: documentWhere,
        include: { client: true, type: true },
        orderBy: { uploadedAt: "desc" },
        // La vue "Bacs" a besoin de l'ensemble des documents (regroupement
        // par type) — seule la vue "Détaillé" pagine.
        ...(isBinView ? {} : { skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      }),
      isBinView ? Promise.resolve(0) : db.document.count({ where: documentWhere }),
      // Requête séparée, non paginée, pour que l'encours reste juste quelle
      // que soit la page affichée (ne pas sommer uniquement `documents`).
      db.document.findMany({
        where: { ...documentWhere, paymentStatus: "unpaid" },
        select: { amountCents: true },
      }),
      db.client.findMany({ where: ACTIVE_CLIENTS, orderBy: { name: "asc" } }),
      db.dropdownList.findUnique({
        where: { key: DOCUMENT_TYPE_LIST_KEY },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      db.companyDocument.findMany({ orderBy: { uploadedAt: "desc" } }),
      db.paymentRecord.findMany({
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const totalPages = isBinView ? 1 : Math.max(1, Math.ceil(documentCount / PAGE_SIZE));

  const outstandingCents = outstandingDocuments
    .filter((doc) => doc.amountCents !== null)
    .reduce((sum, doc) => sum + (doc.amountCents ?? 0), 0);

  const activeFilterCount = [clientId, typeId, status].filter(Boolean).length;

  const binGroups = (typeList?.items ?? []).map((type) => ({
    label: type.label,
    documents: documents.filter((doc) => doc.typeId === type.id),
  }));

  const selectClass =
    "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Renommée le 2026-07-31 (demande explicite) : cette section ne
            couvre que Factures/Devis/Contrats, les documents Commercial/
            Société vivent dans leur propre section plus bas — le titre
            générique "Documents" ne le disait pas. */}
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
          Factures / Devis / Contrats
        </h1>
        <NewDocumentButton
          clients={clients}
          types={typeList?.items.map((item) => ({ id: item.id, label: item.label })) ?? []}
        />
      </div>

      {outstandingCents > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-surface-elevated p-4">
          <p className="text-sm text-ink-muted">
            Encours de paiement :{" "}
            <span className="font-medium text-ink">{formatAmount(outstandingCents, "EUR")}</span>
          </p>
        </div>
      )}

      <div className="mt-8">
        <FilterMenu activeCount={activeFilterCount} label="Filtres">
          <form className="grid gap-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="clientId" className="text-sm font-medium text-ink">
                Client
              </label>
              <select id="clientId" name="clientId" defaultValue={clientId ?? ""} className={selectClass}>
                <option value="">Tous les clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="typeId" className="text-sm font-medium text-ink">
                Type
              </label>
              <select id="typeId" name="typeId" defaultValue={typeId ?? ""} className={selectClass}>
                <option value="">Tous les types</option>
                {typeList?.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="status" className="text-sm font-medium text-ink">
                Statut
              </label>
              <select id="status" name="status" defaultValue={status ?? ""} className={selectClass}>
                <option value="">Tous les statuts</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
              >
                Appliquer
              </button>
              {activeFilterCount > 0 && (
                <Link
                  href="/admin/documents"
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Réinitialiser
                </Link>
              )}
            </div>
          </form>
        </FilterMenu>
      </div>

      {/* Bascule "Détaillé" / "Bacs" (demande du 2026-07-31) : la vue
          détaillée reste celle par défaut (elle porte toutes les actions),
          "Bacs" est une vue de consultation dense, groupée par type, pour
          une vision d'ensemble rapide. */}
      <div className="mt-6 flex gap-2">
        {[
          { value: "", label: "Détaillé" },
          { value: "bacs", label: "Bacs" },
        ].map((option) => {
          const params = new URLSearchParams();
          if (clientId) params.set("clientId", clientId);
          if (typeId) params.set("typeId", typeId);
          if (status) params.set("status", status);
          if (option.value) params.set("vue", option.value);
          const query = params.toString();
          const isActive = option.value === (vue ?? "");
          return (
            <Link
              key={option.label}
              href={query ? `/admin/documents?${query}` : "/admin/documents"}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {documents.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucun document pour le moment.</p>
      ) : isBinView ? (
        <DocumentBinView groups={binGroups} />
      ) : (
        <>
          <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                showClient
                billingEmail={doc.client.billingEmail}
                deleteAction={deleteDocument}
              />
            ))}
          </div>
          <Pagination
            basePath="/admin/documents"
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={{ clientId, typeId, status, vue }}
          />
        </>
      )}

      {/* Section ajoutée le 2026-07-31 : documents internes sans client
          associé (K-bis, statuts, plaquettes commerciales...) — simple
          consultation, pas de montant ni de statut de paiement. */}
      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-sm font-medium text-ink-muted">
          Documents Commercial / Société ({companyDocuments.length})
        </h2>
        <div className="mt-4">
          <CompanyDocumentUploadForm />
        </div>
        {companyDocuments.length > 0 && (
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:gap-8">
            {Object.values(COMPANY_DOCUMENT_CATEGORY).map((category) => {
              const items = companyDocuments.filter((doc) => doc.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category} className="flex-1">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {COMPANY_DOCUMENT_CATEGORY_LABELS[category]} ({items.length})
                  </h3>
                  <div className="mt-2 divide-y divide-line rounded-2xl border border-line">
                    {items.map((doc) => (
                      <CompanyDocumentRow key={doc.id} document={doc} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section ajoutée le 2026-07-31 : paiements reçus sans document de
          facture (acompte par virement, espèces...) — un suivi Client /
          montant / statut minimal, distinct des Factures ci-dessus. */}
      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-sm font-medium text-ink-muted">
          Paiements sans facture ({paymentRecords.length})
        </h2>
        <div className="mt-4">
          <PaymentRecordForm clients={clients} />
        </div>
        {paymentRecords.length > 0 && (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {paymentRecords.map((record) => (
              <PaymentRecordRow
                key={record.id}
                record={{
                  id: record.id,
                  clientId: record.clientId,
                  clientName: record.client.name,
                  label: record.label,
                  amountCents: record.amountCents,
                  currency: record.currency,
                  paymentStatus: record.paymentStatus,
                  date: record.date.toISOString().slice(0, 10),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
