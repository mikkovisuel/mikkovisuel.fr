import type { Metadata } from "next";
import Link from "next/link";
import { FileVideo, Images, NotePencil, Check } from "@phosphor-icons/react/dist/ssr";
import type { Prisma } from "@/generated/prisma/client";
import { verifyAdminSession } from "@/lib/dal";
import { listAssignableAdmins } from "@/lib/assignment";
import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { PALETTE_SWATCH_CLASSES, SOCIAL_CATEGORY_LIST_KEY, type PaletteColor } from "@/lib/dropdown-lists";
import { FilterMenu } from "@/components/admin/filter-menu";
import { StatusBadge } from "@/components/status-badge";
import {
  AgendaMiniMonth,
  AgendaMonthView,
  agendaRange,
  parseAgendaParams,
} from "@/components/admin/agenda-month-view";
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
} from "@/lib/social-posts";
import { routineOccurrencesInMonth } from "@/lib/social-routines";
import { SocialActionsBoard } from "@/components/admin/social-actions-board";
import { NewSocialActionButton } from "@/components/admin/social-action-buttons";
import { moveSocialPostToDay } from "@/lib/actions/social-posts";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";
import { getMyPreferences } from "@/lib/admin-preferences-server";

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
                {(post.category || requestedTaskStatus(post) || post._count.notes > 0 || post.readyAt) && (
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
                        {post.readyAt && post.status !== SOCIAL_POST_STATUS.PUBLIE && (
                      <span className="inline-flex items-center gap-1 text-ink-muted">
                        <Check size={12} weight="bold" className="text-accent" />
                        Prête
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

const AGENDA_COLORS = [
  "bg-orange-600",
  "bg-green-700",
  "bg-blue-600",
  "bg-purple-600",
  "bg-pink-600",
  "bg-teal-600",
  "bg-amber-600",
  "bg-indigo-600",
];

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
    /** Calendrier : vue (mois | semaine | jour) et jour affiché (2026-10-20). */
    cal?: string;
    jour?: string;
    /** Calendrier façon Agenda : clients décochés, actions et routines masquées. */
    masquer?: string;
    actions?: string;
    routines?: string;
    /** « Mes publications » : attribuées à l'admin connecté (2026-10-20). */
    moi?: string;
  }>;
}) {
  const me = await verifyAdminSession();
  const params = await searchParams;
  const mineOnly = params.moi === "1";
  const { clientId, reseau, statut, categorie, mois, cal, jour, masquer, actions: actionsParam, routines: routinesParam } = params;
  // Vue par défaut du profil (« Mon affichage », 2026-10-20), seulement en
  // arrivant sur la page sans aucun paramètre.
  const vue = params.vue ?? (Object.keys(params).length === 0 ? (await getMyPreferences()).views.reseaux : undefined);
  const categories = await db.dropdownItem.findMany({
    where: { list: { key: SOCIAL_CATEGORY_LIST_KEY } },
    select: { id: true, slug: true, label: true },
    orderBy: { sortOrder: "asc" },
  });
  const category = categories.find((item) => item.slug === categorie);
  const view =
    vue === "calendrier" ? "calendrier" : vue === "grille" ? "grille" : vue === "afaire" ? "afaire" : "liste";
  const status = isSocialPostStatus(statut) ? statut : undefined;
  const network = SOCIAL_NETWORKS.some((item) => item.slug === reseau) ? reseau : undefined;

  const where: Prisma.SocialPostWhereInput = {
    client: EXCLUDE_DEMO_CLIENT,
    ...(clientId ? { clientId } : {}),
    ...(network ? { networks: { has: network } } : {}),
    ...(status ? { status } : {}),
    ...(category ? { categoryId: category.id } : {}),
    ...(mineOnly ? { assignedAdminId: me.id } : {}),
  };

  const now = new Date();
  const [posts, clients, actions, admins] = await Promise.all([
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
    // Actions (2026-09-25) : la liste "À faire" et les cases du calendrier.
    // Les actions faites restent visibles, repliées, pour garder une trace.
    db.socialAction.findMany({
      where: {
        ...(clientId ? { OR: [{ clientId }, { clientId: null }] } : {}),
        ...(mineOnly ? { assignedAdminId: me.id } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        assignedAdmin: { select: { id: true, email: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    listAssignableAdmins(),
  ]);

  const activeFilterCount = [clientId, network, status, category].filter(Boolean).length;
  const filterParams: Record<string, string> = {};
  if (clientId) filterParams.clientId = clientId;
  if (network) filterParams.reseau = network;
  if (status) filterParams.statut = status;
  if (category) filterParams.categorie = category.slug;
  if (mineOnly) filterParams.moi = "1";

  const toPublishNow = posts.filter(
    (post) => post.status === SOCIAL_POST_STATUS.VALIDE && post.scheduledAt !== null && post.scheduledAt <= now,
  );
  const published = posts
    .filter((post) => post.status === SOCIAL_POST_STATUS.PUBLIE)
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, PUBLISHED_LIMIT);
  const upcoming = posts.filter((post) => post.status !== SOCIAL_POST_STATUS.PUBLIE && !toPublishNow.includes(post));

  const pendingActionCount = actions.filter((action) => !action.doneAt).length;

  // Période du calendrier (vues Jour / Semaine / Mois, 2026-10-20).
  const { mode: calendarMode, anchor: calendarAnchor } = parseAgendaParams(
    { cal, jour, mois },
    toParisWallClockDate(now),
  );
  const calendarYear = calendarAnchor.getFullYear();
  const calendarMonth = calendarAnchor.getMonth();

  // Calendrier façon Agenda (2026-10-20) : un client décoché, les actions ou
  // les routines masquées restent dans l'URL, avec la vue et les filtres.
  const hiddenClients = (masquer ?? "").split(",").filter(Boolean);
  const showActions = actionsParam !== "0";
  const showRoutines = routinesParam !== "0";
  const calendarParams: Record<string, string> = {
    ...filterParams,
    vue: "calendrier",
    ...(hiddenClients.length ? { masquer: hiddenClients.join(",") } : {}),
    ...(showActions ? {} : { actions: "0" }),
    ...(showRoutines ? {} : { routines: "0" }),
  };
  const calendarHref = (overrides: Record<string, string | undefined>) => {
    const search = new URLSearchParams(calendarParams);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    search.set("cal", calendarMode);
    search.set("jour", `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(calendarAnchor.getDate()).padStart(2, "0")}`);
    return `/admin/reseaux?${search.toString()}`;
  };
  // Couleur d'un client, stable tant que la liste des clients ne change pas
  // (ordre alphabétique), comme la couleur d'un agenda.
  const clientColor = (id: string) => {
    const index = clients.findIndex((client) => client.id === id);
    return AGENDA_COLORS[(index === -1 ? 0 : index) % AGENDA_COLORS.length];
  };

  // Mois affiché, bornes en heure de Paris (calendrier, cases fantômes,
  // équilibre du mois).
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = parseParisDateTimeLocal(`${calendarYear}-${pad(calendarMonth + 1)}-01T00:00`)!;
  const monthEnd = parseParisDateTimeLocal(
    calendarMonth === 11 ? `${calendarYear + 1}-01-01T00:00` : `${calendarYear}-${pad(calendarMonth + 2)}-01T00:00`,
  )!;
  // Bornes de la période affichée, en heure de Paris : routines et actions du
  // calendrier y sont limitées (la vue Mois déborde sur les semaines voisines).
  const wallRange = agendaRange(calendarMode, calendarAnchor);
  const toParis = (date: Date) =>
    parseParisDateTimeLocal(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00`)!;
  const rangeStart = toParis(wallRange.start);
  const rangeEnd = toParis(wallRange.end);
  const rangeMonths = [
    ...new Map(
      [wallRange.start, new Date(wallRange.end.getTime() - 86_400_000)].map((date) => [
        `${date.getFullYear()}-${date.getMonth()}`,
        [date.getFullYear(), date.getMonth()] as const,
      ]),
    ).values(),
  ];
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(calendarYear, calendarMonth, 1)),
  );

  // Routines sans publication ce jour-là : cases "à préparer" du calendrier
  // (2026-09-25 — remplace les anciens créneaux récurrents). Un clic ouvre
  // la création pré-remplie.
  const ghostEntries =
    view === "calendrier"
      ? await (async () => {
          const routines = await db.socialRoutine.findMany({
            where: {
              active: true,
              set: {
                active: true,
                isTemplate: false,
                clientId: clientId ? clientId : { not: null },
                client: EXCLUDE_DEMO_CLIENT,
              },
            },
            include: { set: { include: { client: { select: { id: true, name: true } } } } },
          });
          if (routines.length === 0) return [];
          const monthPosts = await db.socialPost.findMany({
            where: {
              clientId: { in: routines.map((routine) => routine.set.clientId!).filter(Boolean) },
              scheduledAt: { gte: rangeStart, lt: rangeEnd },
            },
            select: { clientId: true, scheduledAt: true },
          });
          return routines.flatMap((routine) => {
            const client = routine.set.client;
            if (!client) return [];
            return rangeMonths
              .flatMap(([year, month]) => routineOccurrencesInMonth(routine, year, month, now))
              .filter((occurrence) => occurrence >= rangeStart && occurrence < rangeEnd)
              .filter(
                (occurrence) =>
                  !monthPosts.some(
                    (post) =>
                      post.clientId === client.id &&
                      post.scheduledAt &&
                      isSameParisDay(post.scheduledAt, occurrence),
                  ),
              )
              .map((occurrence) => {
                const params = new URLSearchParams({
                  clientId: client.id,
                  titre: routine.title,
                  format: routine.format,
                  reseaux: routine.networks.join(","),
                  date: toParisDateTimeLocal(occurrence),
                });
                return {
                  id: `routine-${routine.id}-${occurrence.getTime()}`,
                  title: `${client.name} · ${routine.title}`,
                  eventDate: toParisWallClockDate(occurrence),
                  status: { color: "slate", label: routine.createsDraft ? "Brouillon prévu" : "À préparer" },
                  href: `/admin/reseaux/nouveau?${params.toString()}`,
                  ghost: true,
                  clientId: client.id,
                  routineTitle: routine.title,
                };
              });
          });
        })()
      : [];

  // Actions du mois affiché : elles apparaissent dans les cases du
  // calendrier à côté des publications (choix du client : les deux vues).
  const actionEntries =
    view === "calendrier"
      ? actions
          .filter((action) => action.dueAt >= rangeStart && action.dueAt < rangeEnd)
          .map((action) => ({
            id: `action-${action.id}`,
            title: `${action.doneAt ? "✓ " : ""}${action.title}`,
            eventDate: toParisWallClockDate(action.dueAt),
            status: {
              color: action.doneAt ? "emerald" : "amber",
              label: action.doneAt ? "Action faite" : "Action à faire",
            },
            details: action.client ? [action.client.name] : ["Interne"],
            href: "/admin/reseaux?vue=afaire",
            clientId: action.client?.id ?? null,
            done: Boolean(action.doneAt),
          }))
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
    <>
      <PageToolbar title="Réseaux sociaux">
        <Link
          href="/admin/reseaux/routines"
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
        >
          Programmation
        </Link>
        <Link
          href="/admin/reseaux/plans"
          className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
        >
          Plans
        </Link>
        {clientId && (
          <Link
            href={`/admin/reseaux/clients/${clientId}`}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
          >
            Réglages du client
          </Link>
        )}
        <NewSocialActionButton
          clients={clients}
          admins={admins}
          currentAdminId={me.id}
          defaultDueAt={`${toParisDateTimeLocal(now).slice(0, 10)}T09:00`}
        />
        <Link
          href={clientId ? `/admin/reseaux/nouveau?clientId=${clientId}` : "/admin/reseaux/nouveau"}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Nouvelle publication
        </Link>
      </PageToolbar>
      <div className={PAGE_BODY}>
        <p className="text-sm text-ink-muted">
          Calendrier éditorial de vos clients : préparation, validation, publication.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
          {/* Travail à deux admins (2026-10-20) : bascule « Mes publications ». */}
          <Link
            href={(() => {
              const next = new URLSearchParams(filterParams);
              if (mineOnly) next.delete("moi");
              else next.set("moi", "1");
              if (view !== "liste") next.set("vue", view);
              const query = next.toString();
              return query ? `/admin/reseaux?${query}` : "/admin/reseaux?vue=liste";
            })()}
            aria-pressed={mineOnly}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
              mineOnly ? "border-transparent bg-select text-ink" : "border-[var(--color-outline)] text-ink hover:bg-ink/[0.04]"
            }`}
          >
            {mineOnly && <Check size={16} weight="bold" />}
            Mes publications
          </Link>
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
          </div>

          <nav className="segmented flex flex-wrap gap-2">
            {(["liste", "calendrier", "grille", "afaire"] as const).map((option) => {
              const params = new URLSearchParams(filterParams);
              params.set("vue", option);
              const query = params.toString();
              return (
                <Link
                  key={option}
                  href={`/admin/reseaux?${query}`}
                  aria-current={option === view ? "page" : undefined}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    option === view
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {option === "liste"
                    ? "Liste"
                    : option === "calendrier"
                      ? "Calendrier"
                      : option === "grille"
                        ? "Grille Instagram"
                        : `À faire${pendingActionCount > 0 ? ` (${pendingActionCount})` : ""}`}
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

        {view === "afaire" ? (
          <SocialActionsBoard actions={actions} clients={clients} now={now} admins={admins} />
        ) : view === "grille" ? (
          <InstagramGrid posts={posts} clientChosen={Boolean(clientId)} />
        ) : view === "calendrier" ? (
          // Calendrier façon Google Agenda (livraison 3 de la refonte
          // Workspace, 2026-10-20) : panneau de gauche avec le petit mois, les
          // clients comme des agendas qu'on coche et les éléments facultatifs.
          <div className="mt-2 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
            <aside className="mt-4 hidden flex-col gap-6 lg:flex">
              <AgendaMiniMonth
                mode={calendarMode}
                selected={calendarAnchor}
                year={calendarYear}
                month={calendarMonth}
                basePath="/admin/reseaux"
                params={calendarParams}
              />
              {!clientId && clients.length > 0 && (
                <div>
                  <p className="pb-1 pl-2 text-sm font-medium text-ink">Clients</p>
                  {clients.map((client) => {
                    const shown = !hiddenClients.includes(client.id);
                    return (
                      <Link
                        key={client.id}
                        href={calendarHref({
                          masquer: (shown
                            ? [...hiddenClients, client.id]
                            : hiddenClients.filter((id) => id !== client.id)
                          ).join(","),
                        })}
                        role="checkbox"
                        aria-checked={shown}
                        className="flex h-8 items-center gap-3 rounded-full px-2 text-sm text-ink transition-colors hover:bg-ink/[0.06]"
                      >
                        <span
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] border-2 text-white ${
                            shown ? `${clientColor(client.id)} border-transparent` : "border-ink-muted"
                          }`}
                        >
                          {shown && <Check size={12} weight="bold" />}
                        </span>
                        <span className="truncate">{client.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
              <div>
                <p className="pb-1 pl-2 text-sm font-medium text-ink">Afficher aussi</p>
                {[
                  { key: "actions", label: "Actions à cocher", shown: showActions },
                  { key: "routines", label: "Routines prévues", shown: showRoutines },
                ].map((option) => (
                  <Link
                    key={option.key}
                    href={calendarHref({ [option.key]: option.shown ? "0" : undefined })}
                    role="checkbox"
                    aria-checked={option.shown}
                    className="flex h-8 items-center gap-3 rounded-full px-2 text-sm text-ink transition-colors hover:bg-ink/[0.06]"
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] border-2 ${
                        option.shown ? "border-transparent bg-ink-muted text-surface" : "border-ink-muted"
                      }`}
                    >
                      {option.shown && <Check size={12} weight="bold" />}
                    </span>
                    {option.label}
                  </Link>
                ))}
              </div>
            </aside>
            <AgendaMonthView
              items={[
                ...posts
                  .filter((post) => !hiddenClients.includes(post.clientId))
                  .map((post) => {
                    const meta = isSocialPostStatus(post.status) ? SOCIAL_POST_STATUS_META[post.status] : null;
                    // Le calendrier regroupe par jour avec les accesseurs
                    // locaux : on lui passe l'heure de Paris, sinon une
                    // publication à 00 h 30 tomberait la veille.
                    const date = post.scheduledAt ? toParisWallClockDate(post.scheduledAt) : null;
                    return {
                      id: post.id,
                      title: post.title,
                      date,
                      time: date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : undefined,
                      dotClass: clientColor(post.clientId),
                      href: `/admin/reseaux/${post.id}`,
                      tooltip: [
                        post.client.name,
                        meta?.label ?? post.status,
                        post.category?.label,
                        requestedTaskStatus(post) ? `Création : ${requestedTaskStatus(post)!.label}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                    };
                  }),
                ...(showRoutines ? ghostEntries : [])
                  .filter((entry) => !hiddenClients.includes(entry.clientId))
                  .map((entry) => ({
                    id: entry.id,
                    title: `Routine · ${entry.routineTitle}`,
                    date: entry.eventDate,
                    dotClass: clientColor(entry.clientId),
                    href: entry.href,
                    tooltip: `${entry.title} — ${entry.status.label}`,
                    ghost: true,
                  })),
                ...(showActions ? actionEntries : [])
                  .filter((entry) => !entry.clientId || !hiddenClients.includes(entry.clientId))
                  .map((entry) => ({
                    id: entry.id,
                    title: entry.title,
                    date: entry.eventDate,
                    dotClass: entry.done ? "bg-emerald-600" : "bg-slate-500",
                    href: entry.href,
                    tooltip: `${entry.status.label} · ${entry.details.join(", ")}`,
                  })),
              ]}
              onMove={moveSocialPostToDay}
              mode={calendarMode}
              anchor={calendarAnchor}
              year={calendarYear}
              month={calendarMonth}
              basePath="/admin/reseaux"
              params={calendarParams}
              undatedLabel="Sans date de publication"
            />
          </div>
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
    </>
  );
}
