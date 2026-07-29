import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { FinancesMonthlyChart } from "@/components/admin/finances-monthly-chart";
import { FinancesByClientTable } from "@/components/admin/finances-by-client-table";

export const metadata: Metadata = {
  title: "Finances — Admin Mikko Visuel",
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });

export default async function FinancesPage() {
  await verifyAdminSession();

  const invoices = await db.document.findMany({
    where: {
      type: { slug: DOCUMENT_TYPE.FACTURE },
      client: EXCLUDE_DEMO_CLIENT,
    },
    include: { client: true },
    orderBy: { uploadedAt: "asc" },
  });

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
    </div>
  );
}
