import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DeleteButton } from "@/components/admin/delete-button";
import { StatusBadge } from "@/components/status-badge";
import { cancelPlanRun, deletePlanRun, updatePlanRun } from "@/lib/actions/social-plans";
import { PlanRunForm } from "@/components/admin/social-plan-forms";
import {
  SOCIAL_POST_STATUS,
  SOCIAL_POST_STATUS_META,
  formatDay,
  formatSchedule,
  isSocialPostStatus,
} from "@/lib/social-posts";
import { TASK_STATUS } from "@/lib/dropdown-lists";

export const metadata: Metadata = {
  title: "Suivi d'un plan — Admin Mikko Visuel",
};

// Suivi d'un plan appliqué (2026-09-25) : avancement étape par étape, et
// annulation groupée si l'évènement tombe à l'eau.
export default async function PlanRunPage({ params }: { params: Promise<{ runId: string }> }) {
  await verifyAdminSession();
  const { runId } = await params;

  const run = await db.socialPlanRun.findUnique({
    where: { id: runId },
    include: {
      client: { select: { id: true, name: true } },
      sourceTask: { select: { id: true, title: true } },
      items: {
        include: {
          post: { select: { id: true, title: true, status: true, scheduledAt: true } },
          task: { select: { id: true, title: true, status: { select: { label: true, color: true, slug: true } } } },
        },
        orderBy: { dueAt: "asc" },
      },
    },
  });
  if (!run) notFound();

  const isReady = (item: (typeof run.items)[number]) =>
    (item.post && item.post.status !== SOCIAL_POST_STATUS.IDEE && item.post.status !== SOCIAL_POST_STATUS.REDACTION) ||
    item.task?.status.slug === TASK_STATUS.TERMINE;
  const readyCount = run.items.filter(isReady).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/reseaux/plans"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour aux plans
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">{run.eventName}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            <Link href={`/admin/reseaux/clients/${run.client.id}`} className="hover:text-ink hover:underline">
              {run.client.name}
            </Link>{" "}
            · {run.planName} · évènement {formatDay(run.eventDate)}
            {run.eventPlace ? ` · ${run.eventPlace}` : ""}
          </p>
          {run.sourceTask && (
            <p className="mt-1 text-xs text-ink-muted">
              Appliqué depuis la tâche{" "}
              <Link href={`/admin/taches/${run.sourceTask.id}`} className="text-ink underline underline-offset-2 hover:text-accent">
                {run.sourceTask.title}
              </Link>
            </p>
          )}
        </div>
        {run.canceledAt ? (
          <StatusBadge label="Annulé" color="red" />
        ) : (
          <span className="text-sm text-ink-muted">
            {readyCount}/{run.items.length} étape{run.items.length > 1 ? "s" : ""} prête
            {run.items.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Évènement</h2>
        <p className="mt-1 text-xs text-ink-muted">
          La date n&apos;est pas modifiable ici : les publications, tâches et actions ont déjà été créées à leurs
          propres dates. Pour décaler, déplacez chaque publication dans le calendrier, ou annulez et réappliquez le
          plan.
        </p>
        <div className="mt-4">
          <PlanRunForm
            action={updatePlanRun.bind(null, run.id)}
            defaultName={run.eventName}
            defaultPlace={run.eventPlace ?? ""}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Étapes</h2>
        <ul className="mt-4 grid gap-2">
          {run.items.map((item) => {
            const meta = item.post && isSocialPostStatus(item.post.status) ? SOCIAL_POST_STATUS_META[item.post.status] : null;
            return (
              <li key={item.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{item.label}</p>
                    <p className="mt-1 text-sm text-ink-muted">{formatSchedule(item.dueAt)}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {item.post ? (
                        <Link href={`/admin/reseaux/${item.post.id}`} className="text-ink underline underline-offset-2 hover:text-accent">
                          Publication : {item.post.title}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">Pas de publication</span>
                      )}
                      {item.task && (
                        <Link href={`/admin/taches/${item.task.id}`} className="text-ink underline underline-offset-2 hover:text-accent">
                          Tâche : {item.task.status.label}
                        </Link>
                      )}
                      {item.remindAt && (
                        <span className="text-ink-muted">
                          {item.reminderSentAt ? "Rappel envoyé" : `Rappel le ${formatSchedule(item.remindAt)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  {meta && <StatusBadge label={meta.label} color={meta.color} />}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        {!run.canceledAt && (
          <DeleteButton
            action={cancelPlanRun.bind(null, run.id)}
            confirmMessage="Annuler ce plan ? Les brouillons encore intacts et les tâches non terminées seront supprimés ; ce qui est déjà validé ou publié est conservé."
            label="Annuler le plan"
            className="rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-danger hover:text-danger"
          />
        )}
        <DeleteButton
          action={deletePlanRun.bind(null, run.id)}
          confirmMessage="Supprimer ce suivi ? Les publications et tâches déjà créées ne sont pas supprimées."
          label="Supprimer le suivi"
          icon={<Trash size={14} weight="regular" />}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-danger hover:bg-danger hover:text-white"
        />
      </div>
    </div>
  );
}
