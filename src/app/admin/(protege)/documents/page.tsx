import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";
import { DocumentRow } from "@/components/admin/document-row";
import { deleteDocument } from "@/lib/actions/files";
import { DOCUMENT_TYPE_LIST_KEY } from "@/lib/dropdown-lists";
import { formatAmount } from "@/lib/documents";

export const metadata: Metadata = {
  title: "Documents — Admin Mikko Visuel",
};

const STATUS_OPTIONS = [
  { value: "unpaid", label: "En attente de paiement" },
  { value: "paid", label: "Payée" },
  { value: "n/a", label: "Sans montant" },
];

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; typeId?: string; status?: string }>;
}) {
  await verifyAdminSession();
  const { clientId, typeId, status } = await searchParams;

  const [documents, clients, typeList] = await Promise.all([
    db.document.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(typeId ? { typeId } : {}),
        ...(status ? { paymentStatus: status } : {}),
      },
      include: { client: true, type: true },
      orderBy: { uploadedAt: "desc" },
    }),
    db.client.findMany({ orderBy: { name: "asc" } }),
    db.dropdownList.findUnique({
      where: { key: DOCUMENT_TYPE_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const outstandingCents = documents
    .filter((doc) => doc.paymentStatus === "unpaid" && doc.amountCents !== null)
    .reduce((sum, doc) => sum + (doc.amountCents ?? 0), 0);

  const hasFilters = Boolean(clientId || typeId || status);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Documents</h1>

      {outstandingCents > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-surface-elevated p-4">
          <p className="text-sm text-ink-muted">
            Encours de paiement (documents affichés) :{" "}
            <span className="font-medium text-ink">{formatAmount(outstandingCents, "EUR")}</span>
          </p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line p-6">
        <DocumentUploadForm
          clients={clients}
          types={typeList?.items.map((item) => ({ id: item.id, label: item.label })) ?? []}
        />
      </div>

      <form className="mt-8 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="clientId" className="text-sm font-medium text-ink">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={clientId ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
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
          <select
            id="typeId"
            name="typeId"
            defaultValue={typeId ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
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
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Filtrer
        </button>
        {hasFilters && (
          <Link
            href="/admin/documents"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {documents.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucun document pour le moment.</p>
      ) : (
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
      )}
    </div>
  );
}
