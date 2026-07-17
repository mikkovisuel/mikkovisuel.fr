import type { Metadata } from "next";
import Link from "next/link";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { ValidateRefuseButtons } from "@/components/client/validate-refuse-buttons";
import { FileGrid } from "@/components/file-grid";

export const metadata: Metadata = {
  title: "À valider — Espace client Mikko Visuel",
};

export default async function ClientToValidatePage() {
  const clientUser = await verifyClientSession();

  const tasks = await db.task.findMany({
    where: { clientId: clientUser.clientId, status: { slug: TASK_STATUS.A_VALIDER }, archivedAt: null },
    include: { deliverables: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">À valider</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Validez ou demandez une modification pour les tâches en attente.
      </p>

      {tasks.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucune tâche en attente de validation.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-line p-6">
              <Link
                href={`/espace-client/taches/${task.id}`}
                className="font-medium text-ink hover:underline"
              >
                {task.title}
              </Link>
              {task.description && (
                <p className="mt-1 text-sm text-ink-muted">{task.description}</p>
              )}
              {task.deliverables.length > 0 && (
                <div className="mt-4">
                  <FileGrid files={task.deliverables} downloadBasePath="/api/fichiers/livrables" />
                </div>
              )}
              <div className="mt-4">
                <ValidateRefuseButtons taskId={task.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
