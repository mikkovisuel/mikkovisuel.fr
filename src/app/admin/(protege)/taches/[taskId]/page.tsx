import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  AutosaveChips,
  AutosaveDate,
  AutosaveDescription,
  AutosaveMinutes,
  AutosaveTitle,
} from "@/components/admin/task-autosave";
import { ArrowLeft, DotsThreeVertical } from "@phosphor-icons/react/dist/ssr";
import { TaskPinButton } from "@/components/admin/task-pin-button";
import { TaskPaymentLockControl } from "@/components/admin/task-payment-lock-control";
import { TaskStatusSelect } from "@/components/admin/task-status-select";
import { TaskValidationButton } from "@/components/admin/task-validation-button";
import { TaskValidateRefuseButtons } from "@/components/admin/task-validate-refuse-buttons";
import { TaskTimerButton } from "@/components/admin/task-timer-button";
import { TaskTimeGauge } from "@/components/admin/task-time-gauge";
import { TaskTimeEntries } from "@/components/admin/task-time-entries";
import { DeleteButton } from "@/components/admin/delete-button";
import { DeliverableUploadForm } from "@/components/admin/deliverable-upload-form";
import { AttachmentUploadForm } from "@/components/admin/attachment-upload-form";
import { SendDeliverablesButton } from "@/components/admin/send-deliverables-button";
import { CreatePostFromTaskButton } from "@/components/admin/create-post-from-task-button";
import { formatSchedule } from "@/lib/social-posts";
import { PlanApplyStartForm } from "@/components/admin/social-plan-forms";
import { createSocialPostFromTask } from "@/lib/actions/social-posts";
import { FileGrid } from "@/components/file-grid";
import { TaskCommentThread } from "@/components/task-comment-thread";
import { CollapsibleSection } from "@/components/admin/collapsible-section";
import {
  archiveTask,
  unarchiveTask,
  deleteTask,
  duplicateTask,
} from "@/lib/actions/tasks";
import { TaskChecklist } from "@/components/admin/task-checklist";
import {
  uploadDeliverable,
  deleteDeliverable,
  uploadAttachment,
  deleteAttachment,
} from "@/lib/actions/files";
import { postAdminComment } from "@/lib/actions/comments";
import {
  TASK_STATUS,
  TASK_TYPE_LIST_KEY,
  TASK_FORMAT_LIST_KEY,
  TASK_STATUS_LIST_KEY,
} from "@/lib/dropdown-lists";
import { isTaskOverdue, taskDateFormatter, taskDateTimeFormatter } from "@/lib/tasks";
import { buildDeliverablesMailDraft } from "@/lib/mail-draft";
import { sumTaskTimeMs } from "@/lib/time-tracking";

export const metadata: Metadata = {
  title: "Tâche — Admin Mikko Visuel",
};

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  await verifyAdminSession();
  const { taskId } = await params;

  const [task, typeList, formatList, statusList, plans] = await Promise.all([
    db.task.findUnique({
      where: { id: taskId },
      include: {
        client: true,
        status: true,
        types: true,
        formats: true,
        deliverables: true,
        socialPosts: {
          select: { id: true, title: true, scheduledAt: true, status: true },
          orderBy: { createdAt: "desc" },
        },
        socialPlanRuns: { select: { id: true, eventName: true, planName: true }, orderBy: { createdAt: "desc" } },
        attachments: true,
        comments: { orderBy: { createdAt: "asc" } },
        refusalHistory: { orderBy: { refusedAt: "desc" } },
        statusHistory: { orderBy: { changedAt: "desc" } },
        timeEntries: { orderBy: { startedAt: "desc" } },
        checklistItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_TYPE_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_FORMAT_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_STATUS_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.socialPlan.findMany({
      where: { active: true },
      include: { _count: { select: { steps: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!task) notFound();

  const runningEntry = task.timeEntries.find((entry) => entry.endedAt === null) ?? null;
  const spentMs = sumTaskTimeMs(task.timeEntries);

  const batDeliverables = task.deliverables.filter((d) => d.kind === "bat");
  const finalDeliverables = task.deliverables.filter((d) => d.kind === "final");
  // Visuels reprenables par le module Réseaux sociaux (images et MP4 — pas
  // les PDF ni les ZIP), plafonnés comme dans createSocialPostFromTask.
  const socialReadyCount = Math.min(
    finalDeliverables.filter((d) => ["image/png", "image/jpeg", "image/webp", "video/mp4"].includes(d.mimeType)).length,
    10,
  );

  const H2 = "text-base font-medium text-ink";
  const PANEL_LABEL = "pt-1.5 text-sm text-ink-muted";
  const MENU_ITEM = "w-full rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/[0.06]";

  // Écran d'une tâche façon Gmail / Agenda (maquette B validée le
  // 2026-10-20) : le travail au centre (description, checklist, livrables,
  // fichiers du client, commentaires), et à droite un panneau « Détails »
  // modifiable champ par champ, enregistré automatiquement, suivi du temps
  // passé et de l'historique. Toutes les fonctions de l'ancien écran restent.
  return (
    <>
      <div className="z-20 flex flex-wrap items-center lg:sticky lg:top-0 gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2 sm:px-6 lg:rounded-t-2xl lg:px-8">
        <Link
          href="/admin/taches"
          aria-label="Retour aux tâches"
          title="Retour aux tâches"
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink"
        >
          <ArrowLeft size={20} />
        </Link>
        <AutosaveTitle taskId={task.id} value={task.title} />
        <Link
          href={`/admin/clients/${task.clientId}`}
          className="inline-flex h-7 shrink-0 items-center rounded-full bg-select px-3 text-xs font-medium text-ink transition-colors hover:brightness-95"
        >
          {task.client.name}
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <TaskValidationButton taskId={task.id} currentSlug={task.status.slug} />
          <TaskTimerButton
            taskId={task.id}
            activeEntry={runningEntry ? { startedAt: runningEntry.startedAt.toISOString() } : null}
          />
          <TaskPinButton taskId={task.id} pinned={task.pinnedAt !== null} />
          {/* Gestes rares rangés derrière « ⋮ ». */}
          <details className="relative">
            <summary
              aria-label="Plus d'actions"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.08] [&::-webkit-details-marker]:hidden"
            >
              <DotsThreeVertical size={20} weight="bold" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 flex w-56 flex-col rounded-xl bg-surface p-2 shadow-lg">
              <form action={duplicateTask.bind(null, task.id)}>
                <button type="submit" className={MENU_ITEM}>
                  Dupliquer
                </button>
              </form>
              <form action={(task.archivedAt ? unarchiveTask : archiveTask).bind(null, task.id)}>
                <button type="submit" className={MENU_ITEM}>
                  {task.archivedAt ? "Désarchiver" : "Archiver"}
                </button>
              </form>
              <div className="px-3 py-2">
                <DeleteButton
                  action={deleteTask.bind(null, task.id)}
                  confirmMessage={`Supprimer définitivement "${task.title}" ? Cette action efface aussi tous ses livrables du stockage et ne peut pas être annulée.`}
                />
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Trois blocs : le travail, les détails, le suivi. Sur ordinateur
          (1 200 px et plus), le travail à gauche sur toute la hauteur et les
          deux autres l'un sous l'autre à droite ; plus étroit, les détails
          d'abord, puis le travail, puis le suivi. */}
      <div className="grid min-[1200px]:grid-cols-[minmax(0,1fr)_22rem] min-[1200px]:grid-rows-[auto_1fr]">
        {/* Le travail. */}
        <div className="order-2 flex min-w-0 flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8 min-[1200px]:order-none min-[1200px]:col-start-1 min-[1200px]:row-span-2 min-[1200px]:row-start-1">
          {task.archivedAt && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-ink">
              Tâche archivée le {taskDateFormatter.format(task.archivedAt)} — « ⋮ » pour la désarchiver.
            </p>
          )}
        {task.internal && (
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 text-sm text-ink">
            <p className="font-medium">Tâche interne — le client ne la voit pas</p>
            <p className="mt-1 text-ink-muted">
              Demandée depuis{" "}
              {task.socialPosts.length > 0
                ? task.socialPosts.map((post, index) => (
                    <span key={post.id}>
                      {index > 0 && ", "}
                      la publication{" "}
                      <Link href={`/admin/reseaux/${post.id}`} className="text-ink underline underline-offset-2 hover:text-accent">
                        {post.title}
                      </Link>
                    </span>
                  ))
                : "une publication réseaux (supprimée depuis)"}
              . Aucun email ni fichier n&apos;est envoyé au client ; une fois « Terminé », les fichiers finaux image/MP4
              s&apos;ajoutent aux visuels de la publication.
            </p>
            {/* Contexte pour la personne qui produit (2026-09-25) : quand la
                publication part, et pour quand il faut donc livrer. */}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {task.socialPosts.some((post) => post.scheduledAt) && (
                <p className="text-ink">
                  <span className="text-ink-muted">Publication prévue : </span>
                  {task.socialPosts
                    .filter((post) => post.scheduledAt)
                    .map((post) => formatSchedule(post.scheduledAt))
                    .join(" · ")}
                </p>
              )}
              {task.dueDate && (
                <p className={isTaskOverdue(task) ? "font-medium text-danger" : "text-ink"}>
                  <span className="text-ink-muted">À livrer avant le </span>
                  {taskDateFormatter.format(task.dueDate)}
                </p>
              )}
            </div>
          </div>
        )}


          {task.status.slug === TASK_STATUS.A_VALIDER && <TaskValidateRefuseButtons taskId={task.id} />}
          {task.refusalReason && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-danger">Motif de refus : {task.refusalReason}</p>
          )}

          <section>
            <h2 className={H2}>Description</h2>
            <div className="mt-2">
              <AutosaveDescription taskId={task.id} value={task.description ?? ""} />
            </div>
          </section>

          <section>
            <h2 className={H2}>
              Checklist{" "}
              <span className="font-normal text-ink-muted">
                {task.checklistItems.filter((item) => item.done).length}/{task.checklistItems.length}
              </span>
            </h2>
            <div className="mt-3">
                <TaskChecklist
                  taskId={task.id}
                  initialItems={task.checklistItems.map((item) => ({
                    id: item.id,
                    label: item.label,
                    done: item.done,
                  }))}
                />
            </div>
          </section>

          {/* BAT et livrables finaux côte à côte (2026-07-31) ; un BAT passe
              dans les finaux dès « BAT validé » (`promoteBatDeliverablesToFinal`). */}
          <section>
            <h2 className={H2}>
              Livrables <span className="font-normal text-ink-muted">({task.deliverables.length})</span>
            </h2>
              <div className="mt-3 grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    BAT à valider ({batDeliverables.length})
                  </h3>
                  <div className="mt-3">
                    {batDeliverables.length > 0 ? (
                      <FileGrid
                        files={batDeliverables}
                        downloadBasePath="/api/fichiers/livrables"
                        deleteAction={deleteDeliverable}
                      />
                    ) : (
                      <p className="text-sm text-ink-muted">Aucun BAT en attente.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Livrables finaux ({finalDeliverables.length})
                  </h3>
                  <div className="mt-3 mb-3">
                    <TaskPaymentLockControl
                      taskId={task.id}
                      kind="livrables"
                      clientRequiresPayment={task.client.requirePaymentForDeliverables}
                      lockOverride={task.deliverablesLockOverride}
                      paymentConfirmedAt={task.deliverablesPaymentConfirmedAt}
                    />
                  </div>
                  <div className="mt-3">
                    {finalDeliverables.length > 0 ? (
                      <FileGrid
                        files={finalDeliverables}
                        downloadBasePath="/api/fichiers/livrables"
                        deleteAction={deleteDeliverable}
                      />
                    ) : (
                      <p className="text-sm text-ink-muted">Aucun livrable final.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <SendDeliverablesButton
                  taskId={task.id}
                  sentAt={task.deliverablesSentAt}
                  canSend={Boolean(task.client.billingEmail) && finalDeliverables.length > 0}
                  disabledReason={
                    !task.client.billingEmail
                      ? "Ajoutez un email de facturation sur la fiche client pour envoyer les livrables"
                      : "Aucun livrable final à envoyer"
                  }
                  mailDraftHref={
                    task.client.billingEmail
                      ? buildDeliverablesMailDraft({
                          to: task.client.billingEmail,
                          taskTitle: task.title,
                          eventDate: task.eventDate,
                        })
                      : null
                  }
                />
              </div>

              {socialReadyCount > 0 && !task.internal && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <CreatePostFromTaskButton
                    action={createSocialPostFromTask.bind(null, task.id)}
                    mediaCount={socialReadyCount}
                  />
                  {task.socialPosts.length > 0 && (
                    <span className="text-xs text-ink-muted">
                      Déjà utilisée pour{" "}
                      {task.socialPosts.map((post, index) => (
                        <span key={post.id}>
                          {index > 0 && ", "}
                          <Link href={`/admin/reseaux/${post.id}`} className="text-ink underline underline-offset-2 hover:text-accent">
                            {post.title}
                          </Link>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              )}

              {task.eventDate && plans.some((plan) => plan._count.steps > 0) && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-ink">
                    Appliquer un plan de communication
                  </summary>
                  <p className="mt-2 text-xs text-ink-muted">
                    Crée la séquence (J-30, J-7, J+1…) autour de la date d&apos;évènement de cette tâche. Vous verrez
                    l&apos;aperçu avant que quoi que ce soit ne soit créé.
                  </p>
                  {task.socialPlanRuns.length > 0 && (
                    <p className="mt-2 text-xs text-ink-muted">
                      Déjà appliqué :{" "}
                      {task.socialPlanRuns.map((run, index) => (
                        <span key={run.id}>
                          {index > 0 && ", "}
                          <Link
                            href={`/admin/reseaux/plans/suivi/${run.id}`}
                            className="text-ink underline underline-offset-2 hover:text-accent"
                          >
                            {run.planName} — {run.eventName}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                  <div className="mt-3">
                    <PlanApplyStartForm
                      plans={plans
                        .filter((plan) => plan._count.steps > 0)
                        .map((plan) => ({ id: plan.id, name: plan.name, steps: plan._count.steps }))}
                      clients={[{ id: task.clientId, name: task.client.name }]}
                      defaultClientId={task.clientId}
                      defaultEventName={task.title}
                      defaultEventDate={toDateInputValue(task.eventDate)}
                      sourceTaskId={task.id}
                    />
                  </div>
                </details>
              )}

              <div className="mt-4">
                <DeliverableUploadForm action={uploadDeliverable.bind(null, task.id)} />
              </div>
          </section>

          <section>
            <h2 className={H2}>
              Pièces jointes <span className="font-normal text-ink-muted">({task.attachments.length})</span>
            </h2>
              {task.attachments.length > 0 && (
                <div className="mt-4">
                  <FileGrid
                    files={task.attachments}
                    downloadBasePath="/api/fichiers/pieces-jointes"
                    deleteAction={deleteAttachment}
                  />
                </div>
              )}

              <div className="mt-4">
                <AttachmentUploadForm action={uploadAttachment.bind(null, task.id)} />
              </div>
          </section>

          <section>
            <h2 className={H2}>
              Commentaires <span className="font-normal text-ink-muted">({task.comments.length})</span>
            </h2>
            <div className="mt-3">
              <TaskCommentThread
                comments={task.comments}
                currentAuthorType="ADMIN"
                action={postAdminComment.bind(null, task.id)}
              />
            </div>
          </section>
        </div>

        {/* Panneau « Détails », enregistrement automatique champ par champ. Sur
            téléphone et écran moyen, il passe en tête : statut et dates
            sont ce qu'on consulte d'abord. */}
        <aside className="order-1 flex min-w-0 flex-col gap-6 border-b border-line bg-surface-elevated/40 px-4 py-6 sm:px-6 min-[1200px]:order-none min-[1200px]:col-start-2 min-[1200px]:row-start-1 min-[1200px]:border-b-0 min-[1200px]:border-l min-[1200px]:px-5">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Détails</h2>
            <dl className="mt-3 grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3">
              <dt className={PANEL_LABEL}>Statut</dt>
              <dd className="pt-0.5">
                <TaskStatusSelect
                  taskId={task.id}
                  currentSlug={task.status.slug}
                  currentColor={task.status.color}
                  statuses={statusList?.items ?? []}
                />
              </dd>
              <dt className={PANEL_LABEL}>Client</dt>
              <dd className="pt-1.5 text-sm">
                <Link href={`/admin/clients/${task.clientId}`} className="text-ink hover:underline">
                  {task.client.name} ›
                </Link>
              </dd>
              <dt className={PANEL_LABEL}>Évènement</dt>
              <dd>
                <AutosaveDate taskId={task.id} field="eventDate" value={toDateInputValue(task.eventDate)} label="Date de l'évènement" />
              </dd>
              <dt className={PANEL_LABEL}>Échéance</dt>
              <dd>
                <AutosaveDate taskId={task.id} field="dueDate" value={toDateInputValue(task.dueDate)} label="Échéance (livraison)" />
              </dd>
              <dt className={PANEL_LABEL}>Temps estimé</dt>
              <dd>
                <AutosaveMinutes taskId={task.id} value={task.estimatedMinutes} />
              </dd>
              <dt className={PANEL_LABEL}>Type</dt>
              <dd className="pt-1">
                <AutosaveChips
                  taskId={task.id}
                  field="types"
                  label="Type"
                  options={typeList?.items ?? []}
                  value={task.types.map((type) => type.slug)}
                />
              </dd>
              <dt className={PANEL_LABEL}>Formats</dt>
              <dd className="pt-1">
                <AutosaveChips
                  taskId={task.id}
                  field="formats"
                  label="Formats"
                  options={formatList?.items ?? []}
                  value={task.formats.map((format) => format.slug)}
                />
              </dd>
            </dl>
            {/* Verrou « avant de travailler » : n'a de sens qu'au statut
                « Nouveau » (voir la garde dans `setTaskStatus`). */}
            {task.status.slug === TASK_STATUS.NOUVEAU && (
              <div className="mt-4">
                <TaskPaymentLockControl
                  taskId={task.id}
                  kind="travail"
                  clientRequiresPayment={task.client.requirePaymentBeforeWork}
                  lockOverride={task.workLockOverride}
                  paymentConfirmedAt={task.workPaymentConfirmedAt}
                />
              </div>
            )}
          </section>

        </aside>

        {/* Le suivi : temps passé et historique. */}
        <aside className="order-3 flex min-w-0 flex-col gap-6 border-t border-line bg-surface-elevated/40 px-4 py-6 sm:px-6 min-[1200px]:order-none min-[1200px]:col-start-2 min-[1200px]:row-start-2 min-[1200px]:border-l min-[1200px]:px-5 lg:rounded-br-2xl">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Temps passé</h2>
            <div className="mt-3">
              <TaskTimeGauge spentMs={spentMs} estimatedMinutes={task.estimatedMinutes} />
            </div>
            <div className="mt-4">
              <TaskTimeEntries taskId={task.id} entries={task.timeEntries} />
            </div>
          </section>

          {(task.statusHistory.length > 0 || task.refusalHistory.length > 0) && (
            <section className="flex flex-col gap-4 border-t border-line pt-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Historique</h2>
              {task.statusHistory.length > 0 && (
                <CollapsibleSection title="Statuts" count={task.statusHistory.length}>
                  <ul className="flex flex-col gap-3">
                    {task.statusHistory.map((entry) => (
                      <li
                        key={entry.id}
                        className="border-l-2 border-line pl-3 text-sm"
                      >
                        <p className="text-xs text-ink-muted">
                          {taskDateTimeFormatter.format(entry.changedAt)}
                        </p>
                        <p className="mt-1 text-ink">
                          Statut changé en <span className="font-medium">{entry.statusLabel}</span>{" "}
                          par {entry.changedByName}{" "}
                          <span className="text-ink-muted">
                            ({entry.changedByType === "ADMIN" ? "admin" : "client"})
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}
              {task.refusalHistory.length > 0 && (
                <CollapsibleSection title="Refus" count={task.refusalHistory.length}>
                  <ul className="flex flex-col gap-3">
                    {task.refusalHistory.map((entry) => (
                      <li
                        key={entry.id}
                        className="border-l-2 border-danger/40 pl-3 text-sm"
                      >
                        <p className="text-xs text-ink-muted">
                          {taskDateFormatter.format(entry.refusedAt)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-ink">{entry.reason}</p>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
