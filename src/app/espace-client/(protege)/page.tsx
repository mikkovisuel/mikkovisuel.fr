import type { Metadata } from "next";
import Link from "next/link";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { taskDateFormatter } from "@/lib/tasks";
import { TaskStatusTimeline } from "@/components/client/task-status-timeline";

export const metadata: Metadata = {
  title: "Accueil — Espace client Mikko Visuel",
};

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amountCents / 100);
}

export default async function ClientHomePage() {
  const clientUser = await verifyClientSession();

  const [toValidateCount, unpaidDocuments, activeTasks] = await Promise.all([
    db.task.count({
      where: { clientId: clientUser.clientId, archivedAt: null, status: { slug: TASK_STATUS.A_VALIDER } },
    }),
    db.document.findMany({
      where: { clientId: clientUser.clientId, paymentStatus: "unpaid", amountCents: { not: null } },
    }),
    db.task.findMany({
      where: {
        clientId: clientUser.clientId,
        archivedAt: null,
        status: { slug: { not: TASK_STATUS.TERMINE } },
      },
      include: { status: true },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { eventDate: { sort: "asc", nulls: "last" } }],
      take: 6,
    }),
  ]);

  const unpaidCents = unpaidDocuments.reduce((sum, doc) => sum + (doc.amountCents ?? 0), 0);
  const nextDeadline = activeTasks.find((task) => task.dueDate !== null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Bonjour {clientUser.client.name}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Un aperçu de vos demandes en cours.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/espace-client/a-valider"
          className="rounded-2xl border border-line p-6 transition-colors hover:border-accent"
        >
          <p className="text-sm text-ink-muted">À valider</p>
          <p className="mt-2 font-display text-3xl font-medium text-ink">{toValidateCount}</p>
          {toValidateCount > 0 && <p className="mt-1 text-xs text-accent">En attente de votre retour</p>}
        </Link>

        <div className="rounded-2xl border border-line p-6">
          <p className="text-sm text-ink-muted">Prochaine échéance</p>
          {nextDeadline?.dueDate ? (
            <>
              <p className="mt-2 font-display text-xl font-medium text-ink">
                {taskDateFormatter.format(nextDeadline.dueDate)}
              </p>
              <p className="mt-1 truncate text-xs text-ink-muted">{nextDeadline.title}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Aucune échéance à venir</p>
          )}
        </div>

        <Link
          href="/espace-client/administratif"
          className="rounded-2xl border border-line p-6 transition-colors hover:border-accent"
        >
          <p className="text-sm text-ink-muted">Documents impayés</p>
          <p className="mt-2 font-display text-3xl font-medium text-ink">
            {unpaidCents > 0 ? formatAmount(unpaidCents, "EUR") : "0 €"}
          </p>
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-ink-muted">Tâches en cours</h2>
        {activeTasks.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Aucune tâche en cours pour le moment.</p>
        ) : (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {activeTasks.map((task) => (
              <div key={task.id} className="px-6 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink">{task.title}</p>
                  {task.dueDate && (
                    <p className="text-xs text-ink-muted">
                      Échéance : {taskDateFormatter.format(task.dueDate)}
                    </p>
                  )}
                </div>
                <div className="mt-3">
                  <TaskStatusTimeline statusSlug={task.status.slug} refusalReason={task.refusalReason} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
