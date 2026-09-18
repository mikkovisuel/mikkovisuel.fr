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
import { loadSocialLibraries } from "@/lib/social-library";
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
      sourceTask: { select: { id: true, title: true } },
    },
  });
  if (!post || !isSocialPostStatus(post.status)) notFound();

  const statusMeta = SOCIAL_POST_STATUS_META[post.status];
  const hasContactsToNotify = notifiableEmailsFromContacts(post.client.contacts).length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
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
          {post.sourceTask && (
            <p className="mt-1 text-xs text-ink-muted">
              Créée depuis la tâche{" "}
              <Link href={`/admin/taches/${post.sourceTask.id}`} className="text-ink underline underline-offset-2 hover:text-accent">
                {post.sourceTask.title}
              </Link>
            </p>
          )}
        </div>
        <StatusBadge label={statusMeta.label} color={statusMeta.color} />
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

      <section className={`mt-6 ${SECTION}`}>
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

      <section className={`mt-6 ${SECTION}`}>
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

      <section className={`mt-6 ${SECTION}`}>
        <h2 className={SECTION_TITLE}>Visuels ({post.media.length})</h2>
        <div className="mt-4">
          <SocialPostMediaManager
            postId={post.id}
            media={post.media.map((item) => ({ id: item.id, fileName: item.fileName, mimeType: item.mimeType }))}
          />
        </div>
      </section>

      <section className={`mt-6 ${SECTION}`}>
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
            defaultValues={{
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
