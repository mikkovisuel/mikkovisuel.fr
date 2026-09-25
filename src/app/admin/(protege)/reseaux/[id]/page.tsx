import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { notifiableEmailsFromContacts } from "@/lib/clients";
import { StatusBadge } from "@/components/status-badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { SocialPostForm } from "@/components/admin/social-post-form";
import { SocialPostWorkflow } from "@/components/admin/social-post-workflow";
import { SocialPostStateToggles } from "@/components/admin/social-post-state-toggles";
import { SocialPostMediaManager } from "@/components/admin/social-post-media-manager";
import { SocialPostPreview } from "@/components/social-post-preview";
import { updateSocialPost, deleteSocialPost } from "@/lib/actions/social-posts";
import { loadSocialFormLists, loadSocialLibraries } from "@/lib/social-library";
import {
  requestSocialPostTask,
  addSocialPostNote,
  deleteSocialPostNote,
} from "@/lib/actions/social-posts";
import {
  SocialTaskRequestForm,
  SocialPostNoteForm,
  SocialPostDuplicateForm,
} from "@/components/admin/social-post-task-note-forms";
import { SocialPublishKit } from "@/components/admin/social-publish-kit";
import { SocialCaptionDiff, hasCaptionChanges } from "@/components/social-caption-diff";
import {
  addSocialPostCommentByAdmin,
  deleteSocialPostComment,
  duplicateSocialPost,
  importLinkedTaskMediaNow,
  requestLinkedTaskRevision,
  updateSocialPostComment,
  updateSocialPostNote,
} from "@/lib/actions/social-posts";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import {
  SOCIAL_POST_STATUS,
  CLIENT_VISIBLE_STATUSES,
  captionForNetwork,
  networkLabel,
  readCaptionVariants,
} from "@/lib/social-posts";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import {
  SOCIAL_POST_STATUS_META,
  formatSchedule,
  isSocialPostStatus,
  toParisDateTimeLocal,
} from "@/lib/social-posts";

export const metadata: Metadata = {
  title: "Publication — Admin Mikko Visuel",
};

const SECTION = "rounded-2xl border border-line p-6";
const SECTION_TITLE = "text-xs font-medium uppercase tracking-wide text-ink-muted";

export default async function SocialPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await verifyAdminSession();
  const { id } = await params;

  const post = await db.socialPost.findUnique({
    where: { id },
    include: {
      client: { include: { contacts: { include: { contact: true } } } },
      media: { orderBy: { sortOrder: "asc" } },
      sourceTask: {
        select: {
          id: true,
          title: true,
          internal: true,
          dueDate: true,
          eventDate: true,
          status: { select: { slug: true, label: true, color: true } },
          _count: { select: { deliverables: { where: { kind: "final" } } } },
          // Livrables finaux visibles côté réseaux dès leur dépôt
          // (2026-09-25) : deux personnes différentes tiennent souvent les
          // deux côtés, il ne faut pas avoir à ouvrir Tâches pour savoir.
          deliverables: {
            where: { kind: "final" },
            select: { id: true, fileName: true, mimeType: true },
            orderBy: { uploadedAt: "asc" },
          },
        },
      },
      category: { select: { label: true, color: true } },
      notes: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!post || !isSocialPostStatus(post.status)) notFound();
  const { categories, taskTypes } = await loadSocialFormLists();
  // Création demandée depuis la publication (tâche interne) : section
  // "Création" avec l'avancement ; nouvelle demande possible seulement sans
  // tâche en cours.
  const requestedTask = post.sourceTask?.internal ? post.sourceTask : null;
  const taskInProgress = post.sourceTask && post.sourceTask.status.slug !== TASK_STATUS.TERMINE;
  const defaultDue = (() => {
    if (!post.scheduledAt) return "";
    const due = new Date(toParisDateTimeLocal(post.scheduledAt).slice(0, 10));
    due.setUTCDate(due.getUTCDate() - 3);
    return due.toISOString().slice(0, 10);
  })();

  const duplicateClients = await db.client.findMany({
    where: ACTIVE_CLIENTS,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  // Date proposée pour une copie : une semaine plus tard, même heure.
  const duplicateDate = post.scheduledAt
    ? toParisDateTimeLocal(new Date(post.scheduledAt.getTime() + 7 * 24 * 60 * 60 * 1000))
    : "";
  const clientSees = CLIENT_VISIBLE_STATUSES.includes(post.status);
  // Texte prêt à coller, par réseau ciblé (variante sinon texte commun,
  // puis hashtags).
  const publishTexts = post.networks
    .map((network) => {
      const text = [captionForNetwork(post, network), post.hashtags].filter(Boolean).join("\n\n");
      return { network, label: networkLabel(network), text };
    })
    .filter((item) => item.text);

  const statusMeta = SOCIAL_POST_STATUS_META[post.status];
  const hasContactsToNotify = notifiableEmailsFromContacts(post.client.contacts).length > 0;

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/reseaux"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour aux réseaux sociaux
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">{post.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            <Link href={`/admin/clients/${post.clientId}`} className="hover:text-ink hover:underline">
              {post.client.name}
            </Link>{" "}
            · {formatSchedule(post.scheduledAt)} ·{" "}
            <Link href={`/admin/reseaux/clients/${post.clientId}`} className="hover:text-ink hover:underline">
              Réglages réseaux
            </Link>
          </p>
          {post.sourceTask && !post.sourceTask.internal && (
            <p className="mt-1 text-xs text-ink-muted">
              Créée depuis la tâche{" "}
              <Link href={`/admin/taches/${post.sourceTask.id}`} className="text-ink underline underline-offset-2 hover:text-accent">
                {post.sourceTask.title}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {post.category && <StatusBadge label={post.category.label} color={post.category.color} />}
          <StatusBadge label={statusMeta.label} color={statusMeta.color} />
        </div>
      </div>

      {post.status === "a_modifier" && post.refusalReason && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-ink">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-danger" />
          <div>
            <p className="font-medium">Modification demandée par le client</p>
            <p className="mt-1 whitespace-pre-wrap text-ink-muted">{post.refusalReason}</p>
          </div>
        </div>
      )}

      {post.validatedAt && post.validatedByName && (post.status === "valide" || post.status === "publie") && (
        <p className="mt-4 text-sm text-ink-muted">
          Validée par {post.validatedByName} le {formatSchedule(post.validatedAt)}
        </p>
      )}

      {/* Deux colonnes sur grand écran, comme la fiche tâche : le travail
          (suivi, contenu, visuels) à gauche, le contexte (aperçu, création
          demandée, notes) à droite. Une seule colonne en dessous. */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Suivi</h2>
            {/* Repères internes (2026-09-25), indépendants du cycle client :
                où en est le contenu, et est-ce en ligne. */}
            <div className="mt-3">
              <SocialPostStateToggles
                postId={post.id}
                ready={post.readyAt !== null}
                done={post.status === SOCIAL_POST_STATUS.PUBLIE}
              />
            </div>
            <div className="mt-4">
              <SocialPostWorkflow
                postId={post.id}
                status={post.status}
                hasContactsToNotify={hasContactsToNotify}
                publishedUrl={post.publishedUrl}
              />
            </div>
          </section>

          {(post.status === "valide" || post.status === "publie") && (publishTexts.length > 0 || post.media.length > 0) && (
            <section className={SECTION}>
              <h2 className={SECTION_TITLE}>Kit de publication</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Pour publier depuis le téléphone : texte (avec hashtags) copié pour chaque réseau, visuels à enregistrer.
              </p>
              <div className="mt-4">
                <SocialPublishKit
                  postId={post.id}
                  texts={publishTexts}
                  media={post.media.map((item) => ({ id: item.id, fileName: item.fileName }))}
                />
              </div>
            </section>
          )}

          {(post.status === "a_modifier" || post.status === "a_valider") && hasCaptionChanges(post) && (
            <section className={SECTION}>
              <h2 className={SECTION_TITLE}>Changements depuis la demande de modification</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Barré : texte refusé par le client. Surligné : nouvelle version. Le client voit la même comparaison.
              </p>
              <div className="mt-4 grid gap-4">
                <SocialCaptionDiff label="Texte" before={post.previousCaption ?? ""} after={post.caption ?? ""} />
                <SocialCaptionDiff label="Hashtags" before={post.previousHashtags ?? ""} after={post.hashtags ?? ""} />
              </div>
            </section>
          )}
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Contenu</h2>
            {(post.status === "a_valider" || post.status === "valide") && (
              <p className="mt-2 text-xs text-ink-muted">
                Le client a déjà vu ou validé cette version : une modification importante mérite un nouvel envoi en
                validation.
              </p>
            )}
            <div className="mt-4">
              <SocialPostForm
                action={updateSocialPost.bind(null, post.id)}
                clientId={post.clientId}
                libraries={await loadSocialLibraries([post.clientId])}
                categories={categories}
                defaultValues={{
                  categoryId: post.categoryId ?? undefined,
                  captionVariants: readCaptionVariants(post.captionVariants),
                  title: post.title,
                  networks: post.networks,
                  format: post.format,
                  caption: post.caption ?? "",
                  hashtags: post.hashtags ?? "",
                  scheduledAt: toParisDateTimeLocal(post.scheduledAt),
                }}
                submitLabel="Enregistrer"
              />
            </div>
          </section>
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Visuels ({post.media.length})</h2>
            <div className="mt-4">
              <SocialPostMediaManager
                postId={post.id}
                media={post.media.map((item) => ({ id: item.id, fileName: item.fileName, mimeType: item.mimeType }))}
              />
            </div>
          </section>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Aperçu</h2>
            <p className="mt-1 text-xs text-ink-muted">Rendu approximatif dans un fil Instagram — c&apos;est aussi ce que voit le client.</p>
            <div className="mt-4 flex justify-center">
              <SocialPostPreview
                clientName={post.client.name}
                caption={captionForNetwork(post, "instagram")}
                hashtags={post.hashtags}
                media={post.media.map((item) => ({ id: item.id, mimeType: item.mimeType }))}
              />
            </div>
          </section>
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Création</h2>
            {requestedTask ? (
              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/taches/${requestedTask.id}`}
                    className="font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {requestedTask.title}
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">
                    Tâche interne (invisible du client)
                    {requestedTask.dueDate &&
                      ` · échéance ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(requestedTask.dueDate)}`}
                    {requestedTask.eventDate &&
                      ` · évènement le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(requestedTask.eventDate)}`}
                    {" · "}
                    {post.taskMediaImportedAt
                      ? `fichiers finaux ajoutés aux visuels le ${formatSchedule(post.taskMediaImportedAt)}`
                      : requestedTask.status.slug === TASK_STATUS.TERMINE
                        ? "terminée"
                        : "ses fichiers finaux s'ajouteront aux visuels quand elle sera terminée"}
                  </p>
                </div>
                <StatusBadge label={requestedTask.status.label} color={requestedTask.status.color} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">
                Besoin d&apos;une infographie, d&apos;un contenu ? Créez une tâche interne : elle apparaît dans Tâches, son
                avancement s&apos;affiche ici et sur la carte, et ses fichiers finaux rejoignent les visuels une fois terminée.
              </p>
            )}
            {requestedTask && requestedTask.deliverables.length > 0 && (
              <div className="mt-4 rounded-xl border border-line p-3">
                <p className="text-xs font-medium text-ink">
                  Livrables finaux déposés ({requestedTask.deliverables.length})
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {requestedTask.deliverables.map((file) => (
                    <li key={file.id} className="w-20">
                      <a
                        href={`/api/fichiers/livrables/${file.id}`}
                        title={file.fileName}
                        className="block overflow-hidden rounded-lg border border-line bg-surface-elevated"
                      >
                        {file.mimeType.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element -- vignette servie par une route authentifiée
                          <img
                            src={`/api/fichiers/livrables/${file.id}?thumb=1`}
                            alt={file.fileName}
                            loading="lazy"
                            className="h-20 w-20 object-cover"
                          />
                        ) : (
                          <span className="flex h-20 w-20 items-center justify-center text-center text-[10px] text-ink-muted">
                            {file.fileName.split(".").pop()?.toUpperCase()}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
                {!post.taskMediaImportedAt && (
                  <form action={importLinkedTaskMediaNow.bind(null, post.id)} className="mt-3">
                    <button
                      type="submit"
                      className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
                    >
                      Ajouter aux visuels maintenant
                    </button>
                  </form>
                )}
              </div>
            )}

            {requestedTask && requestedTask.status.slug !== TASK_STATUS.A_MODIFIER && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-ink-muted hover:text-ink">
                  Demander une retouche
                </summary>
                <p className="mt-2 text-xs text-ink-muted">
                  Renvoie la création en « À modifier » avec votre motif, sans passer par la fiche tâche.
                </p>
                <div className="mt-3">
                  <SocialPostNoteForm
                    action={requestLinkedTaskRevision.bind(null, post.id)}
                    placeholder="Ce qu'il faut corriger"
                    submitLabel="Demander la retouche"
                  />
                </div>
              </details>
            )}

            {!taskInProgress && taskTypes.length > 0 && (
              <div className="mt-4">
                <SocialTaskRequestForm
                  action={requestSocialPostTask.bind(null, post.id)}
                  taskTypes={taskTypes}
                  defaultTitle={`Réseaux — ${post.title}`}
                  defaultDueDate={defaultDue}
                />
              </div>
            )}
          </section>
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Notes internes ({post.notes.length})</h2>
            {post.notes.length > 0 && (
              <ul className="mt-4 grid gap-2">
                {post.notes.map((note) => (
                  <li key={note.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words text-sm text-ink">{note.body}</p>
                      <p className="mt-1 text-xs text-ink-muted">{formatSchedule(note.createdAt)}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Modifier</summary>
                        <div className="mt-2">
                          <SocialPostNoteForm
                            action={updateSocialPostNote.bind(null, note.id)}
                            defaultValue={note.body}
                            submitLabel="Enregistrer"
                          />
                        </div>
                      </details>
                    </div>
                    <DeleteButton
                      action={deleteSocialPostNote.bind(null, note.id)}
                      confirmMessage="Supprimer cette note ?"
                      label="Supprimer la note"
                      icon={<Trash size={14} weight="regular" />}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-danger hover:bg-danger hover:text-white"
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <SocialPostNoteForm action={addSocialPostNote.bind(null, post.id)} />
            </div>
          </section>

          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Échange avec le client ({post.comments.length})</h2>
            {clientSees ? (
              <>
                <p className="mt-1 text-xs text-ink-muted">Visible par le client, qui reçoit un email à chaque message.</p>
                <div className="mt-4">
                  <div className="grid gap-2">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="rounded-xl border border-line p-3">
                        <p className="whitespace-pre-wrap break-words text-sm text-ink">{comment.body}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {comment.authorName} · {formatSchedule(comment.createdAt)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-start gap-3">
                          {comment.authorType === "ADMIN" && (
                            <details>
                              <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">
                                Modifier
                              </summary>
                              <div className="mt-2">
                                <SocialPostNoteForm
                                  action={updateSocialPostComment.bind(null, comment.id)}
                                  defaultValue={comment.body}
                                  submitLabel="Enregistrer"
                                />
                              </div>
                            </details>
                          )}
                          <DeleteButton
                            action={deleteSocialPostComment.bind(null, comment.id)}
                            confirmMessage={
                              comment.authorType === "ADMIN"
                                ? "Supprimer votre message ?"
                                : "Supprimer ce message du client ? Il ne le verra plus non plus."
                            }
                            label="Supprimer le message"
                            className="text-xs text-ink-muted underline underline-offset-2 hover:text-danger"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <SocialPostNoteForm
                    action={addSocialPostCommentByAdmin.bind(null, post.id)}
                    placeholder="Écrire au client"
                    submitLabel="Envoyer au client"
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">
                Disponible une fois la publication envoyée au client pour validation (il ne voit pas les brouillons).
              </p>
            )}
          </section>

          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Dupliquer</h2>
            <div className="mt-4">
              <SocialPostDuplicateForm
                action={duplicateSocialPost.bind(null, post.id)}
                clients={duplicateClients}
                defaultClientId={post.clientId}
                defaultScheduledAt={duplicateDate}
              />
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <DeleteButton
          action={deleteSocialPost.bind(null, post.id)}
          confirmMessage={`Supprimer définitivement "${post.title}" et ses visuels ?`}
          label="Supprimer la publication"
          icon={
            <span className="inline-flex items-center gap-2">
              <Trash size={16} weight="regular" />
              Supprimer la publication
            </span>
          }
          className="rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-danger hover:bg-danger hover:text-white"
        />
      </div>
    </div>
  );
}
