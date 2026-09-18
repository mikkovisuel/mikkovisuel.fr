import type { Metadata } from "next";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import type { Prisma } from "@/generated/prisma/client";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { FileGrid } from "@/components/file-grid";
import { StatusBadge } from "@/components/status-badge";
import { SocialPostValidateButtons } from "@/components/client/social-post-validate-buttons";
import {
  CLIENT_VISIBLE_STATUSES,
  SOCIAL_POST_STATUS,
  SOCIAL_POST_STATUS_META,
  formatLabel,
  formatSchedule,
  isSocialPostStatus,
  networkLabel,
} from "@/lib/social-posts";

export const metadata: Metadata = {
  title: "Réseaux sociaux — Espace client Mikko Visuel",
};

type Post = Prisma.SocialPostGetPayload<{ include: { media: true } }>;

function PostCard({ post, readOnly }: { post: Post; readOnly: boolean }) {
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

      {post.media.length > 0 && (
        <div className="mt-4">
          <FileGrid files={post.media} downloadBasePath="/api/fichiers/reseaux" />
        </div>
      )}

      {post.caption && <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{post.caption}</p>}
      {post.hashtags && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{post.hashtags}</p>}

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
    </article>
  );
}

function Section({ title, posts, readOnly }: { title: string; posts: Post[]; readOnly: boolean }) {
  if (posts.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium text-ink">
        {title} ({posts.length})
      </h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} readOnly={readOnly} />
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
    include: { media: { orderBy: { sortOrder: "asc" } } },
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
          <Section title="À valider" posts={byStatus(SOCIAL_POST_STATUS.A_VALIDER)} readOnly={readOnly} />
          <Section title="En cours de modification" posts={byStatus(SOCIAL_POST_STATUS.A_MODIFIER)} readOnly={readOnly} />
          <Section title="Validées, à venir" posts={byStatus(SOCIAL_POST_STATUS.VALIDE)} readOnly={readOnly} />
          <Section title="Publiées" posts={published} readOnly={readOnly} />
        </div>
      )}
    </div>
  );
}
