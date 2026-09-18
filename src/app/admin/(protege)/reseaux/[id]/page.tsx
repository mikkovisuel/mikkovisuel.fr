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
import { SocialPostMediaManager } from "@/components/admin/social-post-media-manager";
import { SocialPostPreview } from "@/components/social-post-preview";
import { updateSocialPost, deleteSocialPost } from "@/lib/actions/social-posts";
import { loadSocialFormLists, loadSocialLibraries } from "@/lib/social-library";
import {
  requestSocialPostTask,
  addSocialPostNote,
  deleteSocialPostNote,
} from "@/lib/actions/social-posts";
import { SocialTaskRequestForm, SocialPostNoteForm } from "@/components/admin/social-post-task-note-forms";
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
        },
      },
      category: { select: { label: true, color: true } },
      notes: { orderBy: { createdAt: "desc" } },
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
            <div className="mt-4">
              <SocialPostWorkflow
                postId={post.id}
                status={post.status}
                hasContactsToNotify={hasContactsToNotify}
                publishedUrl={post.publishedUrl}
              />
            </div>
          </section>
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
                caption={post.caption}
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
                    {requestedTask.status.slug === TASK_STATUS.TERMINE
                      ? post.taskMediaImportedAt
                        ? `fichiers finaux ajoutés aux visuels le ${formatSchedule(post.taskMediaImportedAt)}`
                        : "terminée"
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
