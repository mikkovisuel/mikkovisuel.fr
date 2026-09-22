import type { Metadata } from "next";
import Link from "next/link";
import { FileVideo, Images, NotePencil } from "@phosphor-icons/react/dist/ssr";
import type { Prisma } from "@/generated/prisma/client";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { PALETTE_SWATCH_CLASSES, SOCIAL_CATEGORY_LIST_KEY, type PaletteColor } from "@/lib/dropdown-lists";
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
  toParisDateTimeLocal,
  isSameParisDay,
  parseParisDateTimeLocal,
  slotOccurrencesInMonth,
} from "@/lib/social-posts";
import { moveSocialPostToDay } from "@/lib/actions/social-posts";

export const metadata: Metadata = {
  title: "Réseaux sociaux — Admin Mikko Visuel",
};

const SELECT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const PUBLISHED_LIMIT = 30;

const POST_ROW_INCLUDE = {
  client: { select: { name: true } },
  media: { select: { id: true, mimeType: true }, orderBy: { sortOrder: "asc" }, take: 1 },
  category: { select: { label: true, color: true } },
  sourceTask: { select: { id: true, internal: true, status: { select: { label: true, color: true } } } },
  _count: { select: { notes: true } },
} satisfies Prisma.SocialPostInclude;

type PostRow = Prisma.SocialPostGetPayload<{ include: typeof POST_ROW_INCLUDE }>;

// Avancement de la création demandée depuis la publication (tâche interne) :
// affiché sur les cartes de la liste et du calendrier (demande du client,
// 2026-09-18). Une tâche simplement à l'origine de la publication (créée
// depuis ses livrables) n'est pas une "création demandée".
function requestedTaskStatus(post: PostRow) {
  return post.sourceTask?.internal ? post.sourceTask.status : null;
}

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
                {(post.category || requestedTaskStatus(post) || post._count.notes > 0) && (
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {post.category && <StatusBadge label={post.category.label} color={post.category.color} />}
                    {requestedTaskStatus(post) && (
                      <span className="inline-flex items-center gap-1.5 text-ink-muted">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            PALETTE_SWATCH_CLASSES[requestedTaskStatus(post)!.color as PaletteColor] ??
                            PALETTE_SWATCH_CLASSES.slate
                          }`}
                        />
                        Création : {requestedTaskStatus(post)!.label}
                      </span>
                    )}
                    {post._count.notes > 0 && (
                      <span className="inline-flex items-center gap-1 text-ink-muted">
                        <NotePencil size={12} weight="regular" />
                        {post._count.notes} note{post._count.notes > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <span className="hidden shrink-0 text-right text-sm sm:block">
                <span className={late ? "font-medium text-danger" : "text-ink-muted"}>
                  {formatSchedule(post.scheduledAt)}
                </span>
                {late && <span className="block text-xs text-danger">En retard</span>}
                {post.status === SOCIAL_POST_STATUS.PUBLIE && !post.publishedUrl && (
                  <span className="block text-xs text-amber-600 dark:text-amber-400">Lien manquant</span>
                )}
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
  searchParams: Promise<{
    clientId?: string;
    reseau?: string;
    statut?: string;
    categorie?: string;
    vue?: string;
    mois?: string;
  }>;
}) {
  await verifyAdminSession();
  const { clientId, reseau, statut, categorie, vue, mois } = await searchParams;
  const categories = await db.dropdownItem.findMany({
    where: { list: { key: SOCIAL_CATEGORY_LIST_KEY } },
    select: { id: true, slug: true, label: true },
    orderBy: { sortOrder: "asc" },
  });
  const category = categories.find((item) => item.slug === categorie);
  const view = vue === "calendrier" ? "calendrier" : vue === "grille" ? "grille" : "liste";
  const status = isSocialPostStatus(statut) ? statut : undefined;
  const network = SOCIAL_NETWORKS.some((item) => item.slug === reseau) ? reseau : undefined;

  const where: Prisma.SocialPostWhereInput = {
    client: EXCLUDE_DEMO_CLIENT,
    ...(clientId ? { clientId } : {}),
    ...(network ? { networks: { has: network } } : {}),
    ...(status ? { status } : {}),
    ...(category ? { categoryId: category.id } : {}),
  };

  const now = new Date();
  const [posts, clients] = await Promise.all([
    db.socialPost.findMany({
      where,
      include: POST_ROW_INCLUDE,
      orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    }),
    db.client.findMany({
      where: { ...EXCLUDE_DEMO_CLIENT, socialPosts: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeFilterCount = [clientId, network, status, category].filter(Boolean).length;
  const filterParams: Record<string, string> = {};
  if (clientId) filterParams.clientId = clientId;
  if (network) filterParams.reseau = network;
  if (status) filterParams.statut = status;
  if (category) filterParams.categorie = category.slug;

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

  // Mois affiché, bornes en heure de Paris (calendrier, cases fantômes,
  // équilibre du mois).
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = parseParisDateTimeLocal(`${calendarYear}-${pad(calendarMonth + 1)}-01T00:00`)!;
  const monthEnd = parseParisDateTimeLocal(
    calendarMonth === 11 ? `${calendarYear + 1}-01-01T00:00` : `${calendarYear}-${pad(calendarMonth + 2)}-01T00:00`,
  )!;
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(calendarYear, calendarMonth, 1)),
  );

  // Créneaux récurrents sans publication ce jour-là : cases fantômes du
  // calendrier (2026-09-18), un clic ouvre la création pré-remplie.
  const ghostEntries =
    view === "calendrier"
      ? await (async () => {
          const slots = await db.socialRecurringSlot.findMany({
            where: { active: true, client: EXCLUDE_DEMO_CLIENT, ...(clientId ? { clientId } : {}) },
            include: { client: { select: { name: true } } },
          });
          if (slots.length === 0) return [];
          const monthPosts = await db.socialPost.findMany({
            where: {
              clientId: { in: slots.map((slot) => slot.clientId) },
              scheduledAt: { gte: monthStart, lt: monthEnd },
            },
            select: { clientId: true, scheduledAt: true },
          });
          return slots.flatMap((slot) =>
            slotOccurrencesInMonth(slot.weekday, slot.time, calendarYear, calendarMonth, now)
              .filter(
                (occurrence) =>
                  !monthPosts.some(
                    (post) =>
                      post.clientId === slot.clientId &&
                      post.scheduledAt &&
                      isSameParisDay(post.scheduledAt, occurrence),
                  ),
              )
              .map((occurrence) => {
                const params = new URLSearchParams({
                  clientId: slot.clientId,
                  titre: slot.title,
                  format: slot.format,
                  reseaux: slot.networks.join(","),
                  date: toParisDateTimeLocal(occurrence),
                });
                return {
                  id: `creneau-${slot.id}-${occurrence.getTime()}`,
                  title: `${slot.client.name} · ${slot.title}`,
                  eventDate: toParisWallClockDate(occurrence),
                  status: { color: "slate", label: "Créneau à préparer" },
                  href: `/admin/reseaux/nouveau?${params.toString()}`,
                  ghost: true,
                };
              }),
          );
        })()
      : [];

  // Équilibre du mois pour le client filtré (2026-09-18) : répartition des
  // publications du mois affiché par catégorie, zéros compris — c'est ce
  // qui manque qui compte.
  const monthBalance = clientId
    ? await (async () => {
        const monthPosts = await db.socialPost.findMany({
          where: { clientId, scheduledAt: { gte: monthStart, lt: monthEnd } },
          select: { categoryId: true },
        });
        const counts = categories.map((item) => ({
          label: item.label,
          count: monthPosts.filter((post) => post.categoryId === item.id).length,
        }));
        const uncategorized = monthPosts.filter((post) => !post.categoryId).length;
        return { total: monthPosts.length, counts, uncategorized };
      })()
    : null;

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
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Catégorie
              <select name="categorie" defaultValue={category?.slug ?? ""} className={SELECT}>
                <option value="">Toutes les catégories</option>
                {categories.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
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

      {monthBalance && (
        <p className="mt-4 text-sm text-ink-muted">
          <span className="capitalize">{monthLabel}</span> : {monthBalance.total} publication
          {monthBalance.total > 1 ? "s" : ""}
          {monthBalance.counts.map((item) => (
            <span key={item.label} className={item.count === 0 ? "text-ink-muted/60" : "text-ink"}>
              {" · "}
              {item.label} {item.count}
            </span>
          ))}
          {monthBalance.uncategorized > 0 && <span> · Sans catégorie {monthBalance.uncategorized}</span>}
        </p>
      )}

      {view === "grille" ? (
        <InstagramGrid posts={posts} clientChosen={Boolean(clientId)} />
      ) : view === "calendrier" ? (
        <TaskCalendarView
          tasks={[
            ...posts.map((post) => {
            const meta = isSocialPostStatus(post.status) ? SOCIAL_POST_STATUS_META[post.status] : null;
            return {
              id: post.id,
              title: `${post.client.name} · ${post.title}`,
              // Le calendrier regroupe par jour avec les accesseurs locaux
              // du serveur (UTC en production) : on lui passe l'heure de
              // Paris, sinon une publication à 00 h 30 tomberait la veille.
              eventDate: post.scheduledAt ? toParisWallClockDate(post.scheduledAt) : null,
              status: { color: meta?.color ?? "slate", label: meta?.label ?? post.status },
              details: [
                ...(post.category ? [post.category.label] : []),
                ...(requestedTaskStatus(post) ? [`Création : ${requestedTaskStatus(post)!.label}`] : []),
              ],
            };
          }),
            ...ghostEntries,
          ]}
          onMove={moveSocialPostToDay}
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
              {published.some((post) => !post.publishedUrl) && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {published.filter((post) => !post.publishedUrl).length} sans lien du post : ouvrez-les pour l&apos;ajouter
                  (le client et le rapport mensuel en ont besoin).
                </p>
              )}
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
