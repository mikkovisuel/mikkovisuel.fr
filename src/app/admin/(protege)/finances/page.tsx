import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { EXCLUDE_DEMO_CLIENT, ACTIVE_CLIENTS } from "@/lib/clients";
import { FinancesMonthlyChart } from "@/components/admin/finances-monthly-chart";
import { FinancesByClientTable } from "@/components/admin/finances-by-client-table";
import { TimeReportTable } from "@/components/admin/time-report-table";
import { FilterMenu } from "@/components/admin/filter-menu";
import { buildClientTimeRows } from "@/lib/time-report";

export const metadata: Metadata = {
  title: "Finances — Admin Mikko Visuel",
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Filtre par client et par année/mois (demande du 2026-07-31) — remplace
// l'ancien sélecteur "30 derniers jours / 12 derniers mois / depuis le
// début" (`REPORT_PERIODS`, retiré de src/lib/time-report.ts), qui ne
// couvrait ni le client ni un mois précis. Les deux blocs de la page
// (résumé + Temps & rentabilité) partagent désormais exactement le même
// filtre plutôt que deux logiques différentes.
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

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; annee?: string; mois?: string }>;
}) {
  await verifyAdminSession();
  const { clientId, annee, mois } = await searchParams;
  const { since, until } = dateRange(annee, mois);
  const currentYear = new Date().getFullYear();
  // Choix des années proposées au filtre : les 6 dernières, plus l'année en
  // cours si jamais elle n'apparaît pas encore dans les factures (site tout
  // neuf) — jamais un intervalle déduit des données, pour rester stable
  // même sans aucune facture.
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Une facture "mensuelle" (demande du 2026-07-31, voir le formulaire
  // d'ajout de document) se rattache au mois convenu avec le client
  // (`invoiceYear`/`invoiceMonth`), pas à sa date de chargement dans
  // l'app — les deux peuvent différer de plusieurs jours. Le filtre
  // période doit donc tester les deux cas : `uploadedAt` pour une facture
  // "à la tâche" ordinaire, `invoiceYear`/`invoiceMonth` pour une facture
  // mensuelle.
  const year = annee ? Number.parseInt(annee, 10) : null;
  const month = mois ? Number.parseInt(mois, 10) : null;
  const periodFilter =
    since && until
      ? {
          OR: [
            { isMonthlyInvoice: false, uploadedAt: { gte: since, lt: until } },
            {
              isMonthlyInvoice: true,
              invoiceYear: year,
              ...(month ? { invoiceMonth: month } : {}),
            },
          ],
        }
      : {};

  const invoiceWhere = {
    type: { slug: DOCUMENT_TYPE.FACTURE },
    client: EXCLUDE_DEMO_CLIENT,
    ...(clientId ? { clientId } : {}),
    ...periodFilter,
  };

  const [invoices, clients, timeEntries] = await Promise.all([
    db.document.findMany({
      where: invoiceWhere,
      include: { client: true },
      orderBy: { uploadedAt: "asc" },
    }),
    db.client.findMany({ where: ACTIVE_CLIENTS, orderBy: { name: "asc" } }),
    // Rapport temps/rentabilité — mêmes filtres que le résumé ci-dessus
    // (client, année/mois), rattachement d'une session à la période par sa
    // date de **début** : règle simple et lisible, une session à cheval sur
    // la borne compte pour le jour où elle a commencé.
    db.taskTimeEntry.findMany({
      where: {
        ...(since ? { startedAt: { gte: since, ...(until ? { lt: until } : {}) } } : {}),
        task: { client: EXCLUDE_DEMO_CLIENT, ...(clientId ? { clientId } : {}) },
      },
      select: {
        startedAt: true,
        endedAt: true,
        task: { select: { clientId: true, client: { select: { name: true, archivedAt: true } } } },
      },
    }),
  ]);

  const timeRows = buildClientTimeRows({ timeEntries, invoices });

  const monthly = new Map<string, { billedCents: number; collectedCents: number }>();
  const byClient = new Map<
    string,
    { clientId: string; clientName: string; billedCents: number; collectedCents: number }
  >();
  let totalBilledCents = 0;
  let totalCollectedCents = 0;

  for (const invoice of invoices) {
    const amount = invoice.amountCents ?? 0;
    const collected = invoice.paymentStatus === "paid" ? amount : 0;
    totalBilledCents += amount;
    totalCollectedCents += collected;

    // Même logique que le filtre ci-dessus : une facture mensuelle se
    // regroupe sur le mois convenu, pas sur sa date de chargement.
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

  // Sans filtre d'année : les 12 derniers mois ayant des données (comme
  // avant). Avec une année choisie : les 12 mois de cette année précise,
  // dans l'ordre — montrer "les 12 derniers mois" glissants n'aurait plus
  // eu de sens une fois qu'on a demandé une année donnée.
  const monthlyData = annee
    ? Array.from({ length: 12 }, (_, i) => {
        const key = `${annee}-${String(i + 1).padStart(2, "0")}`;
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

  const byClientData = Array.from(byClient.values()).sort((a, b) => b.billedCents - a.billedCents);

  const currency = invoices[0]?.currency ?? "EUR";
  const totalFormatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    totalBilledCents / 100,
  );
  const collectedFormatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    totalCollectedCents / 100,
  );
  const outstandingFormatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    (totalBilledCents - totalCollectedCents) / 100,
  );

  const activeFilterCount = [clientId, annee, mois].filter(Boolean).length;
  const selectClass =
    "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Finances</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Vue consolidée des factures (hors devis et contrats), client de démonstration exclu.
          </p>
        </div>
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
              <label htmlFor="annee" className="text-sm font-medium text-ink">
                Année
              </label>
              <select id="annee" name="annee" defaultValue={annee ?? ""} className={selectClass}>
                <option value="">Toutes les années</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="mois" className="text-sm font-medium text-ink">
                Mois
              </label>
              <select id="mois" name="mois" defaultValue={mois ?? ""} className={selectClass}>
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
              {activeFilterCount > 0 && (
                <Link
                  href="/admin/finances"
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Réinitialiser
                </Link>
              )}
            </div>
          </form>
        </FilterMenu>
      </div>

      {/* Facturé en rouge, encaissé en vert (demande du 2026-07-31) — avant,
          les deux montants étaient rendus dans la même couleur neutre, sans
          distinguer d'un coup d'œil ce qui reste dû de ce qui est réglé. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-ink-muted">Facturé (total)</p>
          <p className="mt-1 font-display text-2xl font-medium text-danger">{totalFormatted}</p>
        </div>
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-ink-muted">Encaissé</p>
          <p className="mt-1 font-display text-2xl font-medium text-emerald-600 dark:text-emerald-400">
            {collectedFormatted}
          </p>
        </div>
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-ink-muted">Reste dû</p>
          <p className="mt-1 font-display text-2xl font-medium text-ink">{outstandingFormatted}</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">
          {activeFilterCount > 0
            ? "Aucune facture ne correspond à ce filtre."
            : "Aucune facture pour le moment."}
        </p>
      ) : (
        <>
          <div className="mt-8">
            <h2 className="text-sm font-medium text-ink">Facturé vs encaissé, par mois</h2>
            <FinancesMonthlyChart data={monthlyData} currency={currency} />
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-medium text-ink">Par client</h2>
            <FinancesByClientTable data={byClientData} currency={currency} />
          </div>
        </>
      )}

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-lg font-medium text-ink">Temps &amp; rentabilité</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Temps réellement chronométré sur les tâches, rapproché du montant facturé sur la même
          période — mêmes filtres client/année/mois que ci-dessus. Le taux horaire n&apos;est
          affiché que si les deux sont renseignés.
        </p>

        <TimeReportTable rows={timeRows} currency={currency} />
      </section>
    </div>
  );
}
