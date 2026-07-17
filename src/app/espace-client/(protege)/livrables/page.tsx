import type { Metadata } from "next";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { FileGrid } from "@/components/file-grid";

export const metadata: Metadata = {
  title: "Livrables — Espace client Mikko Visuel",
};

export default async function ClientDeliverablesPage() {
  const clientUser = await verifyClientSession();

  const tasks = await db.task.findMany({
    where: { clientId: clientUser.clientId, status: { slug: TASK_STATUS.TERMINE }, archivedAt: null },
    include: { deliverables: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Livrables</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Les fichiers finaux de vos tâches terminées, disponibles au téléchargement.
      </p>

      {tasks.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucun livrable pour le moment.</p>
      ) : (
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {tasks.map((task) => (
            <details key={task.id} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="font-medium text-ink">{task.title}</span>
                <span className="text-sm text-ink-muted">
                  {task.deliverables.length} fichier{task.deliverables.length > 1 ? "s" : ""}
                </span>
              </summary>
              <div className="mt-4">
                {task.deliverables.length === 0 ? (
                  <p className="text-sm text-ink-muted">Aucun fichier déposé pour l&apos;instant.</p>
                ) : (
                  <FileGrid files={task.deliverables} downloadBasePath="/api/fichiers/livrables" />
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
