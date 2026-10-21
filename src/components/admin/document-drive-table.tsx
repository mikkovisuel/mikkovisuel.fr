import { FilePdf } from "@phosphor-icons/react/dist/ssr";
import { DocumentActions, DocumentRow } from "@/components/admin/document-row";
import { formatAmount, isOverdue } from "@/lib/documents";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";

// Documents de la page Administratif à la manière de Google Drive
// (refonte « Workspace », livraison 3, 2026-10-20) : des cartes « à
// surveiller » en tête (impayés, les retards d'abord), puis un tableau
// Nom / Client / Montant / Statut / Échéance / Envoyé dont les commandes
// apparaissent au survol de la ligne, comme dans Drive. Sur téléphone, la
// ligne détaillée d'avant reste affichée : un tableau à sept colonnes n'y
// tient pas. Les commandes sont les mêmes partout (`DocumentActions`).

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const DATE_YEAR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function shortDate(date: Date) {
  return date.getFullYear() === new Date().getFullYear() ? DATE.format(date) : DATE_YEAR.format(date);
}

interface DriveDocument {
  id: string;
  clientId: string;
  typeId: string;
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
  client: { name: string; billingEmail: string | null };
}

/** État du document : pastille de couleur et libellé, comme les statuts des
 * tâches. */
function documentState(document: DriveDocument) {
  if (document.type.slug === DOCUMENT_TYPE.DEVIS && document.acceptedAt) {
    return { dot: "bg-emerald-600", label: "Signé", tone: "text-ink" };
  }
  if (document.amountCents === null || document.paymentStatus === "n/a") {
    return { dot: "bg-slate-400", label: "Sans montant", tone: "text-ink-muted" };
  }
  if (document.paymentStatus === "paid") return { dot: "bg-emerald-600", label: "Payée", tone: "text-ink" };
  if (isOverdue(document)) return { dot: "bg-red-600", label: "En retard", tone: "font-medium text-danger" };
  return { dot: "bg-orange-500", label: "En attente", tone: "text-ink" };
}

function DocIcon({ className = "" }: { className?: string }) {
  return <FilePdf size={20} weight="fill" className={`shrink-0 text-red-600 ${className}`} aria-hidden />;
}

type SharedProps = {
  deleteAction?: (id: string) => Promise<void>;
  companyDocuments?: { id: string; fileName: string }[];
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  editOptions?: { clients: { id: string; name: string }[]; types: { id: string; label: string }[] };
};

/** Cartes « à surveiller » : 4 impayés au plus, les retards d'abord. */
export function DocumentSuggestions({ documents }: { documents: DriveDocument[] }) {
  const unpaid = documents
    .filter((document) => document.paymentStatus === "unpaid" && document.amountCents !== null)
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)))
    .slice(0, 4);
  if (unpaid.length === 0) return null;
  return (
    <section aria-label="À surveiller" className="mt-6">
      <h2 className="text-sm font-medium text-ink">À surveiller</h2>
      {/* Téléphone : bandeau qui défile sur le côté, sans vignette. */}
      <div className="-mx-4 mt-3 grid auto-cols-[78%] grid-flow-col gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {unpaid.map((document) => {
          const state = documentState(document);
          return (
            <a
              key={document.id}
              href={`/api/fichiers/documents/${document.id}`}
              target="_blank"
              rel="noopener"
              title={`Ouvrir ${document.fileName}`}
              className="group flex flex-col gap-2 rounded-xl bg-surface-elevated p-3 transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,var(--color-surface-elevated))]"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                <DocIcon />
                <span className="truncate">{document.fileName}</span>
              </span>
              {/* Vignette : une page stylisée, Drive montrerait l'aperçu. */}
              <span className="hidden h-24 items-end justify-center overflow-hidden rounded-lg bg-surface sm:flex">
                <span className="flex h-20 w-16 flex-col gap-1.5 rounded-t-sm border border-b-0 border-line bg-surface px-2 pt-3">
                  <span className="h-1 w-8 rounded bg-ink/30" />
                  <span className="h-1 w-10 rounded bg-ink/10" />
                  <span className="h-1 w-9 rounded bg-ink/10" />
                  <span className="h-1 w-6 rounded bg-ink/10" />
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                <span className={`h-2 w-2 rounded-full ${state.dot}`} />
                <span className={state.label === "En retard" ? "font-medium text-danger" : ""}>{state.label}</span>
                · {formatAmount(document.amountCents!, document.currency)} · {document.client.name}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function DocumentDriveTable({
  documents,
  showClient = true,
  inCard = false,
  ...shared
}: { documents: DriveDocument[]; showClient?: boolean; inCard?: boolean } & SharedProps) {
  return (
    <>
      {/* Téléphone : lignes détaillées d'avant. */}
      <div className={`divide-y divide-line sm:hidden ${inCard ? "" : "-mx-4 mt-4 border-y border-line"}`}>
        {documents.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            showClient={showClient}
            billingEmail={document.client.billingEmail}
            {...shared}
          />
        ))}
      </div>

      <div
        className={`hidden overflow-x-auto sm:block ${inCard ? "" : "-mx-4 mt-4 border-y border-line sm:-mx-6 lg:-mx-8 2xl:-mx-12"}`}
      >
        <table className={`ws-list w-full border-collapse text-sm ${showClient ? "min-w-[920px]" : "min-w-[760px]"}`}>
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-ink-muted">
              <th className="py-2 pl-4 pr-4 font-medium sm:pl-6 lg:pl-8 2xl:pl-12">Nom</th>
              {showClient && <th className="px-4 py-2 font-medium">Client</th>}
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Montant</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Échéance</th>
              <th className="px-4 py-2 font-medium">Envoyé</th>
              <th className="py-2 pr-4 sm:pr-6 lg:pr-8 2xl:pr-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {documents.map((document) => {
              const state = documentState(document);
              return (
                <tr key={document.id} className="group">
                  <td className="max-w-[22rem] py-2 pl-4 pr-4 sm:pl-6 lg:pl-8 2xl:pl-12">
                    <a
                      href={`/api/fichiers/documents/${document.id}`}
                      target="_blank"
                      rel="noopener"
                      className="flex min-w-0 items-center gap-3 font-medium text-ink hover:underline"
                      title={`Ouvrir ${document.fileName}`}
                    >
                      <DocIcon />
                      <span className="truncate">{document.fileName}</span>
                    </a>
                  </td>
                  {showClient && (
                    <td className="whitespace-nowrap px-4 py-2 text-ink-muted">{document.client.name}</td>
                  )}
                  <td className="whitespace-nowrap px-4 py-2 text-ink-muted">{document.type.label}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-ink">
                    {document.amountCents !== null ? formatAmount(document.amountCents, document.currency) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span className={`inline-flex items-center gap-2 ${state.tone}`}>
                      <span className={`h-2 w-2 rounded-full ${state.dot}`} />
                      {state.label === "Signé" ? (
                        <a
                          href={`/api/fichiers/documents/${document.id}?signature=1`}
                          target="_blank"
                          rel="noopener"
                          className="hover:underline"
                          title={`Voir la signature${document.acceptedByName ? ` de ${document.acceptedByName}` : ""}`}
                        >
                          Signé
                        </a>
                      ) : (
                        state.label
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-ink-muted">
                    {document.isMonthlyInvoice && document.invoiceYear && document.invoiceMonth
                      ? `mensuelle ${String(document.invoiceMonth).padStart(2, "0")}/${document.invoiceYear}`
                      : document.dueDate
                        ? shortDate(document.dueDate)
                        : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-ink-muted">
                    {document.sentAt ? shortDate(document.sentAt) : "Non envoyé"}
                  </td>
                  {/* Commandes au survol, comme Drive ; toujours atteignables
                      au clavier. */}
                  <td className="py-1 pr-4 sm:pr-6 lg:pr-8 2xl:pr-12">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [&_.rounded-full]:border-transparent">
                      <DocumentActions
                        document={document}
                        billingEmail={document.client.billingEmail}
                        compact
                        {...shared}
                      />
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
