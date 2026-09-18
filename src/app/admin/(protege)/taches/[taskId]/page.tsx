import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TaskEditForm } from "@/components/admin/task-edit-form";
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
import { createSocialPostFromTask } from "@/lib/actions/social-posts";
import { FileGrid } from "@/components/file-grid";
import { TaskCommentThread } from "@/components/task-comment-thread";
import { CollapsibleSection } from "@/components/admin/collapsible-section";
import {
  updateTask,
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
import { taskDateFormatter, taskDateTimeFormatter } from "@/lib/tasks";
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

  const [task, typeList, formatList, statusList] = await Promise.all([
    db.task.findUnique({
      where: { id: taskId },
      include: {
        client: true,
        status: true,
        types: true,
        formats: true,
        deliverables: true,
        socialPosts: { select: { id: true, title: true }, orderBy: { createdAt: "desc" } },
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
  ]);

  if (!task) notFound();

  const updateThisTask = updateTask.bind(null, task.id);
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

  return (
    // Passé de `max-w-2xl` (une seule colonne étroite) à la largeur
    // standard de l'app, avec un vrai contenu en deux colonnes à partir de
    // `xl` (demande du 2026-07-31, "sur toute la largeur, exemple :
    // affichage client") — élargir le conteneur seul aurait juste étiré
    // chaque champ sur toute la largeur de l'écran, ce qui aurait rendu le
    // formulaire moins lisible, pas plus.
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      {/* Le retour pointait vers la fiche client, alors qu'on arrive presque
          toujours ici depuis la liste des tâches (signalé le 2026-07-30).
          Le client reste accessible juste à côté : c'était le seul lien vers
          lui sur cette page, le remplacer purement et simplement l'aurait
          rendu injoignable. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <Link
          href="/admin/taches"
          className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} weight="regular" />
          Retour aux tâches
        </Link>
        <span aria-hidden="true" className="text-ink-muted/40">
          ·
        </span>
        <Link
          href={`/admin/clients/${task.clientId}`}
          className="text-ink-muted transition-colors hover:text-ink"
        >
          {task.client.name}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TaskPinButton taskId={task.id} pinned={task.pinnedAt !== null} />
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            {task.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {task.archivedAt ? (
            <>
              <span className="text-sm text-ink-muted">
                Archivée le {taskDateFormatter.format(task.archivedAt)}
              </span>
              <form action={unarchiveTask.bind(null, task.id)}>
                <button
                  type="submit"
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Désarchiver
                </button>
              </form>
            </>
          ) : (
            <form action={archiveTask.bind(null, task.id)}>
              <button
                type="submit"
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                Archiver
              </button>
            </form>
          )}
          <form action={duplicateTask.bind(null, task.id)}>
            <button
              type="submit"
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Dupliquer
            </button>
          </form>
          <DeleteButton
            action={deleteTask.bind(null, task.id)}
            confirmMessage={`Supprimer définitivement "${task.title}" ? Cette action efface aussi tous ses livrables du stockage et ne peut pas être annulée.`}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <TaskStatusSelect
          taskId={task.id}
          currentSlug={task.status.slug}
          currentColor={task.status.color}
          statuses={statusList?.items ?? []}
        />
        <TaskValidationButton taskId={task.id} currentSlug={task.status.slug} />
        <TaskTimerButton
          taskId={task.id}
          activeEntry={runningEntry ? { startedAt: runningEntry.startedAt.toISOString() } : null}
        />
      </div>

      {task.status.slug === TASK_STATUS.A_VALIDER && (
        <div className="mt-4">
          <TaskValidateRefuseButtons taskId={task.id} />
        </div>
      )}

      {/* Verrou "avant de travailler" : n'a plus de sens à afficher une fois
          la tâche sortie de "Nouveau", le blocage ne concerne que le
          démarrage — voir la garde dans `setTaskStatus`. */}
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

      {task.refusalReason && (
        <p className="mt-3 text-sm text-danger">Motif de refus : {task.refusalReason}</p>
      )}

      {/* Deux colonnes à partir de `xl` (demande du 2026-07-31) : le
          contenu principal (édition, livrables, pièces jointes,
          commentaires) à gauche, le suivi (temps, historiques) dans une
          colonne latérale plus étroite à droite — plutôt qu'un seul long
          défilement où le suivi se retrouvait mélangé au contenu de
          travail. */}
      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-12">
          <div>
            <TaskEditForm
              action={updateThisTask}
              taskId={task.id}
              typeOptions={typeList?.items ?? []}
              formatOptions={formatList?.items ?? []}
              defaultValues={{
                title: task.title,
                description: task.description ?? "",
                eventDate: toDateInputValue(task.eventDate),
                dueDate: toDateInputValue(task.dueDate),
                estimatedMinutes: task.estimatedMinutes?.toString() ?? "",
                types: task.types.map((type) => type.slug),
                formats: task.formats.map((format) => format.slug),
              }}
            />
          </div>

          <section>
            <h2 className="text-sm font-medium text-ink-muted">
              Checklist ({task.checklistItems.filter((item) => item.done).length}/
              {task.checklistItems.length})
            </h2>
            <div className="mt-4">
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

          {/* BAT et livrables finaux séparés en deux panneaux côte à côte
              (demande du 2026-07-31) — auparavant une seule liste mélangeait
              les épreuves en attente de validation et le travail
              définitivement livré, sans distinction visuelle. Un BAT
              rejoint automatiquement le panneau "Livrables" (et perd son
              filigrane côté client) dès que la tâche passe au statut "BAT
              validé" — voir `promoteBatDeliverablesToFinal`. */}
          <section>
            <h2 className="text-sm font-medium text-ink-muted">
              Livrables ({task.deliverables.length})
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
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

            {socialReadyCount > 0 && (
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

            <div className="mt-4">
              <DeliverableUploadForm action={uploadDeliverable.bind(null, task.id)} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium text-ink-muted">
              Pièces jointes ({task.attachments.length})
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
            <h2 className="text-sm font-medium text-ink-muted">
              Commentaires ({task.comments.length})
            </h2>
            <div className="mt-4">
              <TaskCommentThread
                comments={task.comments}
                currentAuthorType="ADMIN"
                action={postAdminComment.bind(null, task.id)}
              />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-sm font-medium text-ink-muted">Temps passé</h2>
            <div className="mt-4">
              <TaskTimeGauge spentMs={spentMs} estimatedMinutes={task.estimatedMinutes} />
            </div>
            <div className="mt-4">
              <TaskTimeEntries taskId={task.id} entries={task.timeEntries} />
            </div>
          </section>

          {/* Repliées par défaut (demande du 2026-07-31, "Historique des
              statuts" nommément — le même traitement est appliqué à
              "Historique des refus" pour rester cohérent, plutôt que
              d'alléger l'un et laisser l'autre continuer à pousser le reste
              de la page vers le bas). */}
          {task.statusHistory.length > 0 && (
            <section>
              <CollapsibleSection title="Historique des statuts" count={task.statusHistory.length}>
                <ul className="flex flex-col gap-3">
                  {task.statusHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-line bg-surface-elevated p-3 text-sm"
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
            </section>
          )}

          {task.refusalHistory.length > 0 && (
            <section>
              <CollapsibleSection title="Historique des refus" count={task.refusalHistory.length}>
                <ul className="flex flex-col gap-3">
                  {task.refusalHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-line bg-surface-elevated p-3 text-sm"
                    >
                      <p className="text-xs text-ink-muted">
                        {taskDateFormatter.format(entry.refusedAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-ink">{entry.reason}</p>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
