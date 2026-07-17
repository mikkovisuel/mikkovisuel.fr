import type { Metadata } from "next";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Exports — Admin Mikko Visuel",
};

export default async function AdminExportsPage() {
  await verifyAdminSession();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Exports</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Téléchargez la liste des clients ou des tâches au format CSV.
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        <a
          href="/api/exports/clients"
          className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
        >
          <DownloadSimple size={16} weight="regular" />
          Exporter les clients (CSV)
        </a>
        <a
          href="/api/exports/taches"
          className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
        >
          <DownloadSimple size={16} weight="regular" />
          Exporter les tâches (CSV)
        </a>
      </div>
    </div>
  );
}
