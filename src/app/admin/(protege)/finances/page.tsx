import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { FinancesMonthlyChart } from "@/components/admin/finances-monthly-chart";
import { FinancesByClientTable } from "@/components/admin/finances-by-client-table";
import { TimeReportTable } from "@/components/admin/time-report-table";
import {
  REPORT_PERIODS,
  buildClientTimeRows,
  isReportPeriod,
  periodStart,
  type ReportPeriod,
} from "@/lib/time-report";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Finances — Admin Mikko Visuel",
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  await verifyAdminSession();
  const { periode } = await searchParams;
  const period: ReportPeriod = isReportPeriod(periode) ? periode : "12m";
  const since = periodStart(period);

  const invoices = await db.document.findMany({
    where: {
      type: { slug: DOCUMENT_TYPE.FACTURE },
      client: EXCLUDE_DEMO_CLIENT,
    },
    include: { client: true },
    orderBy: { uploadedAt: "asc" },
  });

  // Rapport temps/rentabilité — les clients archivés y figurent comme dans le
  // reste des Finances : archiver ne doit pas réécrire l'historique.
  const [timeEntries, periodInvoices] = await Promise.all([
    db.taskTimeEntry.findMany({
      // Rattachement d'une session à la période par sa date de **début** :
      // règle simple et lisible, une session à cheval sur la borne compte
      // pour le jour où elle a commencé.
      where: {
        ...(since ? { startedAt: { gte: since } } : {}),
        task: { client: EXCLUDE_DEMO_CLIENT },
      },
      select: {
        startedAt: true,
        endedAt: true,
        task: { select: { clientId: true, client: { select: { name: true, archivedAt: true } } } },
      },
    }),
    db.document.findMany({
      where: {
        type: { slug: DOCUMENT_TYPE.FACTURE },
        client: EXCLUDE_DEMO_CLIENT,
        ...(since ? { uploadedAt: { gte: since } } : {}),
      },
      select: {
        clientId: true,
        amountCents: true,
        client: { select: { name: true, archivedAt: true } },
      },
    }),
  ]);
  const timeRows = buildClientTimeRows({ timeEntries, invoices: periodInvoices });

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

    const key = monthKey(invoice.uploadedAt);
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

  const monthlyData = Array.from(monthly.entries())
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Finances</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Vue consolidée des factures (hors devis et contrats), client de démonstration exclu.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-ink-muted">Facturé (total)</p>
          <p className="mt-1 font-display text-2xl font-medium text-ink">{totalFormatted}</p>
        </div>
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-ink-muted">Encaissé</p>
          <p className="mt-1 font-display text-2xl font-medium text-ink">{collectedFormatted}</p>
        </div>
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-ink-muted">Reste dû</p>
          <p className="mt-1 font-display text-2xl font-medium text-ink">{outstandingFormatted}</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucune facture pour le moment.</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-medium text-ink">Temps &amp; rentabilité</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              Temps réellement chronométré sur les tâches, rapproché du montant facturé sur la
              même période. Le taux horaire n&apos;est affiché que si les deux sont renseignés.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            {REPORT_PERIODS.map((option) => (
              <Link
                key={option.value}
                href={`/admin/finances?periode=${option.value}`}
                className={`rounded-full border px-3 py-1 transition-colors ${
                  period === option.value
                    ? "border-accent bg-accent/10 text-ink"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        <TimeReportTable rows={timeRows} currency={currency} />
      </section>
    </div>
  );
}
