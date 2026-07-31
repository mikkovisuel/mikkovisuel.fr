import type { Metadata } from "next";
import { DownloadSimple, Archive } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { backupInventory } from "@/lib/backup";
import { formatFileSize } from "@/lib/files";

export const metadata: Metadata = {
  title: "Exports — Admin Mikko Visuel",
};

export default async function AdminExportsPage() {
  await verifyAdminSession();

  // Inventaire affiché avant le téléchargement : sur un gros volume, une
  // archive de plusieurs Go ne doit pas être une surprise.
  const { fileCount, totalBytes } = await backupInventory();

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Exports</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Téléchargez la liste des clients, des tâches ou des documents au format CSV.
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
        <a
          href="/api/exports/documents"
          className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
        >
          <DownloadSimple size={16} weight="regular" />
          Exporter les documents (CSV)
        </a>
      </div>

      <div className="mt-8 border-t border-line pt-8">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">
          Sauvegarde complète
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Les 3 exports ci-dessus <strong className="font-medium text-ink">et tous les
          fichiers</strong> : documents, livrables, pièces jointes, avatars et médias du
          portfolio, rangés par client. C&apos;est une vraie sauvegarde — jusqu&apos;au
          2026-07-30 l&apos;archive ne contenait que les CSV, donc des lignes pointant vers des
          fichiers absents.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {fileCount === 0
            ? "Aucun fichier stocké pour l'instant : l'archive ne contiendra que les CSV."
            : `${fileCount} fichier${fileCount > 1 ? "s" : ""} · environ ${formatFileSize(totalBytes)}. La préparation peut prendre un moment sur un gros volume.`}
        </p>
        <a
          href="/api/exports/tout"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          <Archive size={16} weight="regular" />
          Télécharger la sauvegarde complète (ZIP)
        </a>
      </div>
    </div>
  );
}
