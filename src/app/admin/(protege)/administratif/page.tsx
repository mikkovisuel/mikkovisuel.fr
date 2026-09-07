import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "@phosphor-icons/react/dist/ssr";
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
import { FinancesMonthlyChart } from "@/components/admin/finances-monthly-chart";
import { FinancesByClientTable } from "@/components/admin/finances-by-client-table";
import { TimeReportTable } from "@/components/admin/time-report-table";
import { deleteDocument } from "@/lib/actions/files";
import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_LIST_KEY,
  COMPANY_DOCUMENT_CATEGORY,
  COMPANY_DOCUMENT_CATEGORY_LABELS,
} from "@/lib/dropdown-lists";
import { formatAmount } from "@/lib/documents";
import { ACTIVE_CLIENTS, EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { Pagination } from "@/components/admin/pagination";
import { buildClientTimeRows } from "@/lib/time-report";
import { getAppSettings } from "@/lib/settings";
import {
  DEFAULT_DOCUMENT_SENT_SUBJECT,
  DEFAULT_DOCUMENT_SENT_BODY,
} from "@/lib/invoice-email-templates";

export const metadata: Metadata = {
  title: "Administratif — Admin Mikko Visuel",
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

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Filtre par client et par année/mois de la section Finances (demande du
// 2026-07-31) — voir sa note plus bas. Reprend `dateRange` de l'ancienne
// page /admin/finances telle quelle.
function dateRange(annee?: string, mois?: string): { since: Date | null; until: Date | null } {
  const year = annee ? Number.parseInt(annee, 10) : null;
  if (!year || Number.isNaN(year)) return { since: null, until: null };

  const month = mois ? Number.parseInt(mois, 10) : null;
  if (month && !Number.isNaN(month) && month >= 1 && month <= 12) {
    return {
      since: new Date(year, month - 1, 1),
      until: new Date(year, month, 1),
    };
  }
  return { since: new Date(year, 0, 1), until: new Date(year + 1, 0, 1) };
}

export default async function AdminAdministratifPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    typeId?: string;
    status?: string;
    vue?: string;
    page?: string;
    // Section Finances, ci-dessous : préfixées `fin*` pour ne pas entrer en
    // conflit avec les filtres de la section Factures/Devis/Contrats
    // au-dessus, qui vivent sur la même URL depuis la fusion des onglets
    // Facturation et Finances dans Documents (2026-09-06, demande
    // explicite : "intégrer l'onglet facturation/finances dans l'onglet
    // documents").
    finClientId?: string;
    finAnnee?: string;
    finMois?: string;
  }>;
}) {
  await verifyAdminSession();
  const { clientId, typeId, status, vue, page, finClientId, finAnnee, finMois } = await searchParams;
  const isBinView = vue === "bacs";
  const currentPage = Math.max(1, Number(page) || 1);

  const documentWhere = {
    ...(clientId ? { clientId } : {}),
    ...(typeId ? { typeId } : {}),
    ...(status ? { paymentStatus: status } : {}),
  };

  // --- Section Finances : mêmes calculs que l'ancienne page /admin/finances,
  // juste rebranchés sur les paramètres `fin*` ci-dessus.
  const { since: finSince, until: finUntil } = dateRange(finAnnee, finMois);
  const currentYear = new Date().getFullYear();
  const finYearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const finYear = finAnnee ? Number.parseInt(finAnnee, 10) : null;
  const finMonth = finMois ? Number.parseInt(finMois, 10) : null;
  const finPeriodFilter =
    finSince && finUntil
      ? {
          OR: [
            { isMonthlyInvoice: false, uploadedAt: { gte: finSince, lt: finUntil } },
            {
              isMonthlyInvoice: true,
              invoiceYear: finYear,
              ...(finMonth ? { invoiceMonth: finMonth } : {}),
            },
          ],
        }
      : {};
  const finInvoiceWhere = {
    type: { slug: DOCUMENT_TYPE.FACTURE },
    client: EXCLUDE_DEMO_CLIENT,
    ...(finClientId ? { clientId: finClientId } : {}),
    ...finPeriodFilter,
  };
  const finPaymentRecordWhere = {
    client: EXCLUDE_DEMO_CLIENT,
    ...(finClientId ? { clientId: finClientId } : {}),
    ...(finSince && finUntil ? { date: { gte: finSince, lt: finUntil } } : {}),
  };

  const [
    documents,
    documentCount,
    outstandingDocuments,
    clients,
    typeList,
    companyDocuments,
    paymentRecords,
    billingClients,
    finInvoices,
    finPaymentRecords,
    finTimeEntries,
    settings,
  ] = await Promise.all([
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
    // Sélecteur du récapitulatif mensuel (ex-Facturation) : client de démo
    // exclu, mais pas les clients archivés — un ancien client peut encore
    // avoir besoin d'un récapitulatif pour une facture en cours (même
    // raisonnement que Finances ci-dessous).
    db.client.findMany({
      where: EXCLUDE_DEMO_CLIENT,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.document.findMany({
      where: finInvoiceWhere,
      include: { client: true },
      orderBy: { uploadedAt: "asc" },
    }),
    db.paymentRecord.findMany({
      where: finPaymentRecordWhere,
      include: { client: true },
      orderBy: { date: "asc" },
    }),
    // Rapport temps/rentabilité — mêmes filtres que le résumé Finances
    // ci-dessus (client, année/mois), rattachement d'une session à la
    // période par sa date de **début** : règle simple et lisible, une
    // session à cheval sur la borne compte pour le jour où elle a
    // commencé.
    db.taskTimeEntry.findMany({
      where: {
        ...(finSince ? { startedAt: { gte: finSince, ...(finUntil ? { lt: finUntil } : {}) } } : {}),
        task: { client: EXCLUDE_DEMO_CLIENT, ...(finClientId ? { clientId: finClientId } : {}) },
      },
      select: {
        startedAt: true,
        endedAt: true,
        task: { select: { clientId: true, client: { select: { name: true, archivedAt: true } } } },
      },
    }),
    getAppSettings(),
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

  // Paramètres à conserver d'une section à l'autre en changeant de page/vue
  // ou en réinitialisant un filtre — sinon appliquer un filtre Documents
  // effacerait silencieusement un filtre Finances actif, et inversement.
  const allParams = { clientId, typeId, status, vue, finClientId, finAnnee, finMois };
  const now = new Date();
  const billingYearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // --- Agrégation Finances (identique à l'ancienne page /admin/finances).
  const finTimeRows = buildClientTimeRows({ timeEntries: finTimeEntries, invoices: finInvoices });

  const monthly = new Map<string, { billedCents: number; collectedCents: number }>();
  const byClient = new Map<
    string,
    { clientId: string; clientName: string; billedCents: number; collectedCents: number }
  >();
  let totalBilledCents = 0;
  let totalCollectedCents = 0;

  for (const invoice of finInvoices) {
    const amount = invoice.amountCents ?? 0;
    const collected = invoice.paymentStatus === "paid" ? amount : 0;
    totalBilledCents += amount;
    totalCollectedCents += collected;

    const key =
      invoice.isMonthlyInvoice && invoice.invoiceYear && invoice.invoiceMonth
        ? `${invoice.invoiceYear}-${String(invoice.invoiceMonth).padStart(2, "0")}`
        : monthKey(invoice.uploadedAt);
    const monthEntry = monthly.get(key) ?? { billedCents: 0, collectedCents: 0 };
    monthEntry.billedCents += amount;
    monthEntry.collectedCents += collected;
    monthly.set(key, monthEntry);

    const clientEntry = byClient.get(invoice.clientId) ?? {
      clientId: invoice.clientId,
      clientName: invoice.client.name,
      billedCents: 0,
      collectedCents: 0,
    };
    clientEntry.billedCents += amount;
    clientEntry.collectedCents += collected;
    byClient.set(invoice.clientId, clientEntry);
  }

  for (const record of finPaymentRecords) {
    const amount = record.amountCents;
    const collected = record.paymentStatus === "paid" ? amount : 0;
    totalBilledCents += amount;
    totalCollectedCents += collected;

    const key = monthKey(record.date);
    const monthEntry = monthly.get(key) ?? { billedCents: 0, collectedCents: 0 };
    monthEntry.billedCents += amount;
    monthEntry.collectedCents += collected;
    monthly.set(key, monthEntry);

    const clientEntry = byClient.get(record.clientId) ?? {
      clientId: record.clientId,
      clientName: record.client.name,
      billedCents: 0,
      collectedCents: 0,
    };
    clientEntry.billedCents += amount;
    clientEntry.collectedCents += collected;
    byClient.set(record.clientId, clientEntry);
  }

  const finMonthlyData = finAnnee
    ? Array.from({ length: 12 }, (_, i) => {
        const key = `${finAnnee}-${String(i + 1).padStart(2, "0")}`;
        const value = monthly.get(key) ?? { billedCents: 0, collectedCents: 0 };
        return { key, label: MONTH_LABEL.format(new Date(`${key}-01T00:00:00`)), ...value };
      })
    : Array.from(monthly.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([key, value]) => ({
          key,
          label: MONTH_LABEL.format(new Date(`${key}-01T00:00:00`)),
          ...value,
        }));

  const finByClientData = Array.from(byClient.values()).sort((a, b) => b.billedCents - a.billedCents);

  const finCurrency = finInvoices[0]?.currency ?? finPaymentRecords[0]?.currency ?? "EUR";
  const finTotalFormatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency: finCurrency }).format(
    totalBilledCents / 100,
  );
  const finCollectedFormatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: finCurrency,
  }).format(totalCollectedCents / 100);
  const finOutstandingFormatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: finCurrency,
  }).format((totalBilledCents - totalCollectedCents) / 100);

  const finActiveFilterCount = [finClientId, finAnnee, finMois].filter(Boolean).length;

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
            {/* Filtres Finances (préfixe fin*) reportés en champs cachés :
                sans ça, appliquer un filtre Documents effacerait un filtre
                Finances actif plus bas sur la même page. */}
            {finClientId && <input type="hidden" name="finClientId" value={finClientId} />}
            {finAnnee && <input type="hidden" name="finAnnee" value={finAnnee} />}
            {finMois && <input type="hidden" name="finMois" value={finMois} />}
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
                  href={
                    finActiveFilterCount > 0
                      ? `/admin/administratif?${new URLSearchParams({ ...(finClientId ? { finClientId } : {}), ...(finAnnee ? { finAnnee } : {}), ...(finMois ? { finMois } : {}) }).toString()}`
                      : "/admin/administratif"
                  }
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
          if (finClientId) params.set("finClientId", finClientId);
          if (finAnnee) params.set("finAnnee", finAnnee);
          if (finMois) params.set("finMois", finMois);
          const query = params.toString();
          const isActive = option.value === (vue ?? "");
          return (
            <Link
              key={option.label}
              href={query ? `/admin/administratif?${query}` : "/admin/administratif"}
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
                companyDocuments={companyDocuments.map((d) => ({ id: d.id, fileName: d.fileName }))}
                emailSubjectTemplate={settings.documentSentEmailSubject ?? DEFAULT_DOCUMENT_SENT_SUBJECT}
                emailBodyTemplate={settings.documentSentEmailBody ?? DEFAULT_DOCUMENT_SENT_BODY}
              />
            ))}
          </div>
          <Pagination
            basePath="/admin/administratif"
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={allParams}
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

      {/* Section ajoutée le 2026-09-06 (ex-onglet "Facturation", fusionné
          ici sur demande explicite) : récapitulatif PDF des tâches
          terminées d'un client sur un mois donné, pensé comme pièce jointe
          à une facture faite ailleurs — pas de montant, rien enregistré
          dans l'app. Voir src/app/api/exports/facturation/route.ts pour la
          sélection exacte (statut "Terminé", groupé par date d'évènement). */}
      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-lg font-medium text-ink">Récapitulatif mensuel (PDF)</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Génère un récapitulatif PDF des tâches terminées d&apos;un client sur un mois donné, à
          joindre à la facture. Seules les tâches au statut « Terminé » apparaissent, comptées sur
          leur date d&apos;évènement.
        </p>

        <form
          action="/api/exports/facturation"
          target="_blank"
          className="mt-4 grid max-w-3xl gap-4 rounded-2xl border border-line p-6 sm:grid-cols-3"
        >
          <div className="flex flex-col gap-2 sm:col-span-3">
            <label htmlFor="rec-clientId" className="text-sm font-medium text-ink">
              Client
            </label>
            <select id="rec-clientId" name="clientId" required className={selectClass}>
              <option value="">Choisir un client</option>
              {billingClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="rec-annee" className="text-sm font-medium text-ink">
              Année
            </label>
            <select id="rec-annee" name="annee" required defaultValue={currentYear} className={selectClass}>
              {billingYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label htmlFor="rec-mois" className="text-sm font-medium text-ink">
              Mois
            </label>
            <select
              id="rec-mois"
              name="mois"
              required
              defaultValue={now.getMonth() + 1}
              className={selectClass}
            >
              {MONTH_NAMES.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
            >
              <FileText size={16} weight="bold" />
              Générer le PDF
            </button>
          </div>
        </form>
      </section>

      {/* Section ajoutée le 2026-09-06 (ex-onglet "Finances", fusionné ici
          sur demande explicite) : vue consolidée facturé/encaissé, reprise
          telle quelle de l'ancienne page /admin/finances — filtres sur les
          paramètres fin* pour ne pas entrer en conflit avec ceux de
          Factures/Devis/Contrats plus haut sur la même page. */}
      <section className="mt-12 border-t border-line pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-medium text-ink">Finances</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              Vue consolidée des factures (hors devis et contrats) et des paiements sans facture,
              client de démonstration exclu.
            </p>
          </div>
          <FilterMenu activeCount={finActiveFilterCount} label="Filtres">
            <form className="grid gap-3">
              {clientId && <input type="hidden" name="clientId" value={clientId} />}
              {typeId && <input type="hidden" name="typeId" value={typeId} />}
              {status && <input type="hidden" name="status" value={status} />}
              {vue && <input type="hidden" name="vue" value={vue} />}
              <div className="flex flex-col gap-2">
                <label htmlFor="finClientId" className="text-sm font-medium text-ink">
                  Client
                </label>
                <select
                  id="finClientId"
                  name="finClientId"
                  defaultValue={finClientId ?? ""}
                  className={selectClass}
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
                <label htmlFor="finAnnee" className="text-sm font-medium text-ink">
                  Année
                </label>
                <select id="finAnnee" name="finAnnee" defaultValue={finAnnee ?? ""} className={selectClass}>
                  <option value="">Toutes les années</option>
                  {finYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="finMois" className="text-sm font-medium text-ink">
                  Mois
                </label>
                <select id="finMois" name="finMois" defaultValue={finMois ?? ""} className={selectClass}>
                  <option value="">Tous les mois</option>
                  {MONTH_NAMES.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-muted">
                  Un mois choisi sans année filtre sur l&apos;année en cours.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
                >
                  Appliquer
                </button>
                {finActiveFilterCount > 0 && (
                  <Link
                    href={
                      activeFilterCount > 0 || vue
                        ? `/admin/administratif?${new URLSearchParams({ ...(clientId ? { clientId } : {}), ...(typeId ? { typeId } : {}), ...(status ? { status } : {}), ...(vue ? { vue } : {}) }).toString()}`
                        : "/admin/administratif"
                    }
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    Réinitialiser
                  </Link>
                )}
              </div>
            </form>
          </FilterMenu>
        </div>

        {/* Facturé en rouge, encaissé en vert (demande du 2026-07-31) —
            avant, les deux montants étaient rendus dans la même couleur
            neutre, sans distinguer d'un coup d'œil ce qui reste dû de ce
            qui est réglé. */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line p-5">
            <p className="text-sm text-ink-muted">Facturé (total)</p>
            <p className="mt-1 font-display text-2xl font-medium text-danger">{finTotalFormatted}</p>
          </div>
          <div className="rounded-2xl border border-line p-5">
            <p className="text-sm text-ink-muted">Encaissé</p>
            <p className="mt-1 font-display text-2xl font-medium text-emerald-600 dark:text-emerald-400">
              {finCollectedFormatted}
            </p>
          </div>
          <div className="rounded-2xl border border-line p-5">
            <p className="text-sm text-ink-muted">Reste dû</p>
            <p className="mt-1 font-display text-2xl font-medium text-ink">{finOutstandingFormatted}</p>
          </div>
        </div>

        {finInvoices.length === 0 && finPaymentRecords.length === 0 ? (
          <p className="mt-8 text-sm text-ink-muted">
            {finActiveFilterCount > 0
              ? "Aucune facture ni paiement ne correspond à ce filtre."
              : "Aucune facture ni paiement pour le moment."}
          </p>
        ) : (
          <>
            <div className="mt-8">
              <h3 className="text-sm font-medium text-ink">Facturé vs encaissé, par mois</h3>
              <FinancesMonthlyChart data={finMonthlyData} currency={finCurrency} />
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-medium text-ink">Par client</h3>
              <FinancesByClientTable data={finByClientData} currency={finCurrency} />
            </div>
          </>
        )}

        <div className="mt-12 border-t border-line pt-8">
          <h3 className="font-display text-base font-medium text-ink">Temps &amp; rentabilité</h3>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Temps réellement chronométré sur les tâches, rapproché du montant facturé sur la même
            période — mêmes filtres client/année/mois que ci-dessus. Le taux horaire n&apos;est
            affiché que si les deux sont renseignés.
          </p>

          <TimeReportTable rows={finTimeRows} currency={finCurrency} />
        </div>
      </section>
    </div>
  );
}
