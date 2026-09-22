import type { Metadata } from "next";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import type { Prisma } from "@/generated/prisma/client";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { FileGrid } from "@/components/file-grid";
import { StatusBadge } from "@/components/status-badge";
import { SocialPostValidateButtons } from "@/components/client/social-post-validate-buttons";
import { SocialPostPreview } from "@/components/social-post-preview";
import { SocialCaptionDiff, hasCaptionChanges } from "@/components/social-caption-diff";
import { SocialPostThread } from "@/components/social-post-thread";
import { SocialPostNoteForm } from "@/components/admin/social-post-task-note-forms";
import { addSocialPostCommentByClient } from "@/lib/actions/social-posts";
import {
  CLIENT_VISIBLE_STATUSES,
  SOCIAL_POST_STATUS,
  SOCIAL_POST_STATUS_META,
  formatLabel,
  formatSchedule,
  isSocialPostStatus,
  networkLabel,
  captionForNetwork,
  readCaptionVariants,
} from "@/lib/social-posts";

export const metadata: Metadata = {
  title: "Réseaux sociaux — Espace client Mikko Visuel",
};

type Post = Prisma.SocialPostGetPayload<{ include: { media: true; comments: true } }>;

function PostCard({ post, readOnly, clientName }: { post: Post; readOnly: boolean; clientName: string }) {
  const meta = isSocialPostStatus(post.status) ? SOCIAL_POST_STATUS_META[post.status] : null;
  return (
    <article className="rounded-2xl border border-line p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-ink">{post.title}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {post.networks.map(networkLabel).join(", ")} · {formatLabel(post.format)} ·{" "}
            {post.status === SOCIAL_POST_STATUS.PUBLIE && post.publishedAt
              ? `publiée ${formatSchedule(post.publishedAt)}`
              : `prévue ${formatSchedule(post.scheduledAt)}`}
          </p>
        </div>
        {meta && <StatusBadge label={meta.label} color={meta.color} />}
      </div>

      <div className="mt-4">
        <SocialPostPreview
          clientName={clientName}
          caption={captionForNetwork(post, "instagram")}
          hashtags={post.hashtags}
          media={post.media.map((item) => ({ id: item.id, mimeType: item.mimeType }))}
        />
      </div>

      {/* Texte intégral : l'aperçu coupe la légende comme le fait
          Instagram, le client doit pouvoir tout relire avant de valider. */}
      {(post.caption || post.hashtags) && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-muted hover:text-ink">Lire le texte complet</summary>
          {post.caption && <p className="mt-2 whitespace-pre-wrap text-ink">{post.caption}</p>}
          {post.hashtags && <p className="mt-2 whitespace-pre-wrap text-ink-muted">{post.hashtags}</p>}
        </details>
      )}

      {/* Textes adaptés par réseau (2026-09-18), quand il y en a. */}
      {Object.entries(readCaptionVariants(post.captionVariants))
        .filter(([network]) => post.networks.includes(network))
        .map(([network, text]) => (
          <details key={network} className="mt-2 text-sm">
            <summary className="cursor-pointer text-ink-muted hover:text-ink">Texte {networkLabel(network)}</summary>
            <p className="mt-2 whitespace-pre-wrap text-ink">{text}</p>
          </details>
        ))}

      {/* Avant / après une demande de modification (2026-09-18). */}
      {post.status === SOCIAL_POST_STATUS.A_VALIDER && hasCaptionChanges(post) && (
        <div className="mt-4 grid gap-3 rounded-xl border border-line bg-surface-elevated p-3">
          <p className="text-sm font-medium text-ink">Ce qui a changé depuis votre demande</p>
          <SocialCaptionDiff label="Texte" before={post.previousCaption ?? ""} after={post.caption ?? ""} />
          <SocialCaptionDiff label="Hashtags" before={post.previousHashtags ?? ""} after={post.hashtags ?? ""} />
        </div>
      )}

      {post.media.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-ink-muted">Tous les visuels, dans l&apos;ordre ({post.media.length})</p>
          <FileGrid files={post.media} downloadBasePath="/api/fichiers/reseaux" />
        </div>
      )}

      {post.status === SOCIAL_POST_STATUS.A_MODIFIER && post.refusalReason && (
        <div className="mt-4 rounded-xl border border-line bg-surface-elevated p-3 text-sm">
          <p className="font-medium text-ink">Votre demande de modification</p>
          <p className="mt-1 whitespace-pre-wrap text-ink-muted">{post.refusalReason}</p>
          <p className="mt-2 text-xs text-ink-muted">Mikko prépare une nouvelle version.</p>
        </div>
      )}

      {post.status === SOCIAL_POST_STATUS.A_VALIDER && (
        <div className="mt-5">
          <SocialPostValidateButtons postId={post.id} readOnly={readOnly} />
        </div>
      )}

      {post.status === SOCIAL_POST_STATUS.PUBLIE && post.publishedUrl && (
        <a
          href={post.publishedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-2 hover:text-accent"
        >
          Voir la publication
          <ArrowSquareOut size={14} weight="regular" />
        </a>
      )}

      {/* Échange avec Mikko (2026-09-18) — une question, une précision,
          sans passer par une demande de modification. */}
      <details open={post.comments.length > 0} className="mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Échanger avec Mikko{post.comments.length > 0 ? ` (${post.comments.length})` : ""}
        </summary>
        <div className="mt-3 grid gap-3">
          <SocialPostThread comments={post.comments} viewer="CLIENT_USER" />
          {readOnly ? (
            <p className="text-xs text-ink-muted">Espace de démonstration : envoi désactivé.</p>
          ) : (
            <SocialPostNoteForm
              action={addSocialPostCommentByClient.bind(null, post.id)}
              placeholder="Une question, une précision ?"
              submitLabel="Envoyer"
            />
          )}
        </div>
      </details>
    </article>
  );
}

function Section({
  title,
  posts,
  readOnly,
  clientName,
}: {
  title: string;
  posts: Post[];
  readOnly: boolean;
  clientName: string;
}) {
  if (posts.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium text-ink">
        {title} ({posts.length})
      </h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} readOnly={readOnly} clientName={clientName} />
        ))}
      </div>
    </section>
  );
}

export default async function ClientSocialPostsPage() {
  const clientUser = await verifyClientSession();

  // Jamais les brouillons internes ("Idée", "Rédaction") — voir
  // CLIENT_VISIBLE_STATUSES : le client ne reçoit que ce qui est prêt.
  const posts = await db.socialPost.findMany({
    where: { clientId: clientUser.clientId, status: { in: CLIENT_VISIBLE_STATUSES } },
    include: { media: { orderBy: { sortOrder: "asc" } }, comments: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  const byStatus = (status: string) => posts.filter((post) => post.status === status);
  const published = byStatus(SOCIAL_POST_STATUS.PUBLIE).reverse();
  const readOnly = clientUser.client.isDemo;

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Réseaux sociaux</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Vos publications préparées par Mikko : validez-les ou demandez une modification avant leur mise en ligne.
      </p>

      {posts.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucune publication pour le moment.</p>
      ) : (
        <div className="mt-8 grid gap-10">
          <Section title="À valider" posts={byStatus(SOCIAL_POST_STATUS.A_VALIDER)} readOnly={readOnly} clientName={clientUser.client.name} />
          <Section title="En cours de modification" posts={byStatus(SOCIAL_POST_STATUS.A_MODIFIER)} readOnly={readOnly} clientName={clientUser.client.name} />
          <Section title="Validées, à venir" posts={byStatus(SOCIAL_POST_STATUS.VALIDE)} readOnly={readOnly} clientName={clientUser.client.name} />
          <Section title="Publiées" posts={published} readOnly={readOnly} clientName={clientUser.client.name} />
        </div>
      )}
    </div>
  );
}
