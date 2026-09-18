import type { Metadata } from "next";
import Link from "next/link";
import { FileVideo, Images } from "@phosphor-icons/react/dist/ssr";
import type { Prisma } from "@/generated/prisma/client";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { FilterMenu } from "@/components/admin/filter-menu";
import { StatusBadge } from "@/components/status-badge";
import { TaskCalendarView } from "@/components/admin/task-calendar-view";
import {
  SOCIAL_NETWORKS,
  SOCIAL_POST_STATUS,
  SOCIAL_POST_STATUS_META,
  SOCIAL_POST_STATUS_ORDER,
  formatLabel,
  formatSchedule,
  isSocialPostStatus,
  networkLabel,
  toParisWallClockDate,
} from "@/lib/social-posts";

export const metadata: Metadata = {
  title: "Réseaux sociaux — Admin Mikko Visuel",
};

const SELECT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const PUBLISHED_LIMIT = 30;

type PostRow = Prisma.SocialPostGetPayload<{
  include: { client: { select: { name: true } }; media: { select: { id: true; mimeType: true } } };
}>;

function PostList({ posts, now }: { posts: PostRow[]; now: Date }) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line">
      {posts.map((post) => {
        const meta = isSocialPostStatus(post.status) ? SOCIAL_POST_STATUS_META[post.status] : null;
        const cover = post.media[0];
        // "En retard" : la date prévue est passée alors que la publication
        // n'est même pas validée — elle ne peut pas partir à l'heure.
        const late =
          post.scheduledAt !== null &&
          post.scheduledAt < now &&
          post.status !== SOCIAL_POST_STATUS.VALIDE &&
          post.status !== SOCIAL_POST_STATUS.PUBLIE;
        return (
          <li key={post.id}>
            <Link
              href={`/admin/reseaux/${post.id}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-elevated"
            >
              <span className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-elevated text-ink-muted">
                {cover?.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vignette servie par une route authentifiée
                  <img
                    src={`/api/fichiers/reseaux/${cover.id}?thumb=1`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : cover ? (
                  <FileVideo size={18} weight="regular" />
                ) : (
                  <Images size={18} weight="regular" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{post.title}</span>
                <span className="block truncate text-sm text-ink-muted">
                  {post.client.name} · {post.networks.map(networkLabel).join(", ")} · {formatLabel(post.format)}
                </span>
              </span>
              <span className="hidden shrink-0 text-right text-sm sm:block">
                <span className={late ? "font-medium text-danger" : "text-ink-muted"}>
                  {formatSchedule(post.scheduledAt)}
                </span>
                {late && <span className="block text-xs text-danger">En retard</span>}
              </span>
              {meta && <StatusBadge label={meta.label} color={meta.color} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Grille du profil Instagram d'un client, publications prévues comprises :
// c'est l'outil du graphiste pour juger l'harmonie visuelle d'ensemble avant
// de publier (alternance de couleurs, de formats...). Plus récent en haut à
// gauche comme sur Instagram, date de référence = date de publication
// réelle, sinon date prévue. Les stories n'apparaissent pas sur une grille,
// ni les publications sans date (impossible de les placer).
function InstagramGrid({ posts, clientChosen }: { posts: PostRow[]; clientChosen: boolean }) {
  if (!clientChosen) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="text-sm text-ink-muted">Choisissez un client dans les filtres pour afficher sa grille Instagram.</p>
      </div>
    );
  }
  const referenceDate = (post: PostRow) => post.publishedAt ?? post.scheduledAt;
  const gridPosts = posts
    .filter((post) => post.networks.includes("instagram") && post.format !== "story" && referenceDate(post))
    .sort((a, b) => referenceDate(b)!.getTime() - referenceDate(a)!.getTime());

  if (gridPosts.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="text-sm text-ink-muted">Aucune publication Instagram datée pour ce client.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-xl">
      <p className="mb-3 text-xs text-ink-muted">
        Plus récent en haut à gauche. Les publications pas encore en ligne sont signalées par leur date prévue.
      </p>
      <ul className="grid grid-cols-3 gap-1">
        {gridPosts.map((post) => {
          const cover = post.media[0];
          const planned = post.status !== SOCIAL_POST_STATUS.PUBLIE;
          return (
            <li key={post.id}>
              <Link
                href={`/admin/reseaux/${post.id}`}
                title={post.title}
                className="group relative block aspect-[4/5] overflow-hidden bg-surface-elevated"
              >
                {cover?.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vignette servie par une route authentifiée
                  <img
                    src={`/api/fichiers/reseaux/${cover.id}?thumb=1`}
                    alt={post.title}
                    loading="lazy"
                    className={`h-full w-full object-cover ${planned ? "opacity-80" : ""}`}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ink-muted">
                    {cover ? <FileVideo size={24} weight="regular" /> : <Images size={24} weight="regular" />}
                  </span>
                )}
                {planned && (
                  <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-black/65 px-1.5 py-0.5 text-center text-[10px] font-medium text-white">
                    {formatSchedule(post.scheduledAt)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function SocialPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; reseau?: string; statut?: string; vue?: string; mois?: string }>;
}) {
  await verifyAdminSession();
  const { clientId, reseau, statut, vue, mois } = await searchParams;
  const view = vue === "calendrier" ? "calendrier" : vue === "grille" ? "grille" : "liste";
  const status = isSocialPostStatus(statut) ? statut : undefined;
  const network = SOCIAL_NETWORKS.some((item) => item.slug === reseau) ? reseau : undefined;

  const where: Prisma.SocialPostWhereInput = {
    client: EXCLUDE_DEMO_CLIENT,
    ...(clientId ? { clientId } : {}),
    ...(network ? { networks: { has: network } } : {}),
    ...(status ? { status } : {}),
  };

  const now = new Date();
  const [posts, clients] = await Promise.all([
    db.socialPost.findMany({
      where,
      include: {
        client: { select: { name: true } },
        media: { select: { id: true, mimeType: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    }),
    db.client.findMany({
      where: { ...EXCLUDE_DEMO_CLIENT, socialPosts: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeFilterCount = [clientId, network, status].filter(Boolean).length;
  const filterParams: Record<string, string> = {};
  if (clientId) filterParams.clientId = clientId;
  if (network) filterParams.reseau = network;
  if (status) filterParams.statut = status;

  const toPublishNow = posts.filter(
    (post) => post.status === SOCIAL_POST_STATUS.VALIDE && post.scheduledAt !== null && post.scheduledAt <= now,
  );
  const published = posts
    .filter((post) => post.status === SOCIAL_POST_STATUS.PUBLIE)
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, PUBLISHED_LIMIT);
  const upcoming = posts.filter((post) => post.status !== SOCIAL_POST_STATUS.PUBLIE && !toPublishNow.includes(post));

  const [calendarYear, calendarMonth] = (() => {
    const match = mois ? /^(\d{4})-(\d{2})$/.exec(mois) : null;
    if (match) return [Number(match[1]), Number(match[2]) - 1];
    const parisNow = toParisWallClockDate(now);
    return [parisNow.getFullYear(), parisNow.getMonth()];
  })();

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Réseaux sociaux</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Calendrier éditorial de vos clients : préparation, validation, publication.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {clientId && (
            <Link
              href={`/admin/reseaux/clients/${clientId}`}
              className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
            >
              Réglages du client
            </Link>
          )}
          <Link
            href={clientId ? `/admin/reseaux/nouveau?clientId=${clientId}` : "/admin/reseaux/nouveau"}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
          >
            Nouvelle publication
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <FilterMenu activeCount={activeFilterCount} label="Filtres">
          <form className="grid gap-3">
            {view !== "liste" && <input type="hidden" name="vue" value={view} />}
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Client
              <select name="clientId" defaultValue={clientId ?? ""} className={SELECT}>
                <option value="">Tous les clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Réseau
              <select name="reseau" defaultValue={network ?? ""} className={SELECT}>
                <option value="">Tous les réseaux</option>
                {SOCIAL_NETWORKS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Statut
              <select name="statut" defaultValue={status ?? ""} className={SELECT}>
                <option value="">Tous les statuts</option>
                {SOCIAL_POST_STATUS_ORDER.map((slug) => (
                  <option key={slug} value={slug}>
                    {SOCIAL_POST_STATUS_META[slug].label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
              >
                Appliquer
              </button>
              {activeFilterCount > 0 && (
                <Link
                  href={view === "liste" ? "/admin/reseaux" : `/admin/reseaux?vue=${view}`}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Réinitialiser
                </Link>
              )}
            </div>
          </form>
        </FilterMenu>

        <nav className="flex gap-2">
          {(["liste", "calendrier", "grille"] as const).map((option) => {
            const params = new URLSearchParams(filterParams);
            if (option !== "liste") params.set("vue", option);
            const query = params.toString();
            return (
              <Link
                key={option}
                href={query ? `/admin/reseaux?${query}` : "/admin/reseaux"}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  option === view
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {option === "liste" ? "Liste" : option === "calendrier" ? "Calendrier" : "Grille Instagram"}
              </Link>
            );
          })}
        </nav>
      </div>

      {view === "grille" ? (
        <InstagramGrid posts={posts} clientChosen={Boolean(clientId)} />
      ) : view === "calendrier" ? (
        <TaskCalendarView
          tasks={posts.map((post) => {
            const meta = isSocialPostStatus(post.status) ? SOCIAL_POST_STATUS_META[post.status] : null;
            return {
              id: post.id,
              title: `${post.client.name} · ${post.title}`,
              // Le calendrier regroupe par jour avec les accesseurs locaux
              // du serveur (UTC en production) : on lui passe l'heure de
              // Paris, sinon une publication à 00 h 30 tomberait la veille.
              eventDate: post.scheduledAt ? toParisWallClockDate(post.scheduledAt) : null,
              status: { color: meta?.color ?? "slate", label: meta?.label ?? post.status },
            };
          })}
          year={calendarYear}
          month={calendarMonth}
          basePath="/admin/reseaux"
          taskBasePath="/admin/reseaux"
          extraParams={{ ...filterParams, vue: "calendrier" }}
          undatedLabel="Sans date de publication"
        />
      ) : posts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-ink-muted">
            {activeFilterCount > 0
              ? "Aucune publication ne correspond à ces filtres."
              : "Aucune publication pour l'instant. Commencez par en créer une pour un client."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-8">
          {toPublishNow.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-ink">À publier maintenant ({toPublishNow.length})</h2>
              <p className="mt-1 text-xs text-ink-muted">Validées par le client, et leur heure est arrivée.</p>
              <div className="mt-3">
                <PostList posts={toPublishNow} now={now} />
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-ink">En préparation et à venir ({upcoming.length})</h2>
              <div className="mt-3">
                <PostList posts={upcoming} now={now} />
              </div>
            </section>
          )}
          {published.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-ink">
                Publiées {published.length === PUBLISHED_LIMIT ? `(${PUBLISHED_LIMIT} plus récentes)` : `(${published.length})`}
              </h2>
              <div className="mt-3">
                <PostList posts={published} now={now} />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
