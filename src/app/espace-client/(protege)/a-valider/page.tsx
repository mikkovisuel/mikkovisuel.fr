import type { Metadata } from "next";
import Link from "next/link";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { ValidateRefuseButtons } from "@/components/client/validate-refuse-buttons";
import { FileGrid } from "@/components/file-grid";
import { BatReview } from "@/components/bat-review";
import { BAT_DELIVERABLES_INCLUDE, toBatFiles } from "@/lib/bat";
import { LinkifiedText } from "@/components/linkified-text";

export const metadata: Metadata = {
  title: "À valider — Espace client Mikko Visuel",
};

export default async function ClientToValidatePage() {
  const clientUser = await verifyClientSession();

  const tasks = await db.task.findMany({
    where: { clientId: clientUser.clientId, internal: false, status: { slug: TASK_STATUS.A_VALIDER }, archivedAt: null },
    include: { deliverables: { include: BAT_DELIVERABLES_INCLUDE } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
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
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                  <LinkifiedText text={task.description} />
                </p>
              )}
              {task.deliverables.length > 0 && (
                <div className="mt-4 grid gap-3">
                  <BatReview files={toBatFiles(task.deliverables, clientUser.id)} canAnnotate={!clientUser.client.isDemo} />
                  {task.deliverables.some((d) => d.kind !== "bat") && (
                    <FileGrid files={task.deliverables.filter((d) => d.kind !== "bat")} downloadBasePath="/api/fichiers/livrables" />
                  )}
                </div>
              )}
              <div className="mt-4">
                <ValidateRefuseButtons taskId={task.id} readOnly={clientUser.client.isDemo} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
