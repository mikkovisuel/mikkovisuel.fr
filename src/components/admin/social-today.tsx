import Link from "next/link";
import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import {
  SOCIAL_POST_STATUS,
  formatSchedule,
  parseParisDateTimeLocal,
  toParisDateTimeLocal,
} from "@/lib/social-posts";

const LIST_LIMIT = 5;

function Column({
  title,
  empty,
  items,
  more,
}: {
  title: string;
  empty: string;
  items: { id: string; href: string; title: string; meta: string; alert?: boolean }[];
  more: number;
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {items.map((item) => (
            <li key={item.id} className="min-w-0 text-sm">
              <Link href={item.href} className="block truncate font-medium text-ink hover:underline">
                {item.title}
              </Link>
              <p className={`truncate text-xs ${item.alert ? "text-danger" : "text-ink-muted"}`}>{item.meta}</p>
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          et {more} autre{more > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// Carte "Réseaux — aujourd'hui" du tableau de bord (2026-09-18) : ce qui
// est à publier aujourd'hui (ou en retard), ce qui attend le client, les
// créations demandées en cours, et les publications sans lien.
export async function SocialToday() {
  const now = new Date();
  const today = toParisDateTimeLocal(now).slice(0, 10);
  const endOfToday = new Date(parseParisDateTimeLocal(`${today}T23:59`)!.getTime() + 60_000);
  const client = EXCLUDE_DEMO_CLIENT;

  const [toPublish, waiting, creations, missingLinks] = await Promise.all([
    db.socialPost.findMany({
      where: { client, status: SOCIAL_POST_STATUS.VALIDE, scheduledAt: { lt: endOfToday } },
      include: { client: { select: { name: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    db.socialPost.findMany({
      where: { client, status: SOCIAL_POST_STATUS.A_VALIDER },
      include: { client: { select: { name: true } } },
      orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }],
    }),
    db.socialPost.findMany({
      where: {
        client,
        sourceTask: { internal: true, status: { slug: { not: TASK_STATUS.TERMINE } } },
      },
      include: {
        client: { select: { name: true } },
        sourceTask: { select: { status: { select: { label: true } } } },
      },
      orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }],
    }),
    db.socialPost.count({ where: { client, status: SOCIAL_POST_STATUS.PUBLIE, publishedUrl: null } }),
  ]);

  if (toPublish.length + waiting.length + creations.length + missingLinks === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-line p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-medium text-ink">Réseaux — aujourd&apos;hui</h2>
        <Link href="/admin/reseaux" className="text-sm text-ink-muted hover:text-ink">
          Tout voir
        </Link>
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <Column
          title={`À publier (${toPublish.length})`}
          empty="Rien à publier aujourd'hui."
          items={toPublish.slice(0, LIST_LIMIT).map((post) => ({
            id: post.id,
            href: `/admin/reseaux/${post.id}`,
            title: post.title,
            meta: `${post.client.name} · ${formatSchedule(post.scheduledAt)}${
              post.scheduledAt && toParisDateTimeLocal(post.scheduledAt).slice(0, 10) < today ? " · en retard" : ""
            }`,
            alert: Boolean(post.scheduledAt && toParisDateTimeLocal(post.scheduledAt).slice(0, 10) < today),
          }))}
          more={toPublish.length - LIST_LIMIT}
        />
        <Column
          title={`En attente du client (${waiting.length})`}
          empty="Aucune publication en attente de validation."
          items={waiting.slice(0, LIST_LIMIT).map((post) => ({
            id: post.id,
            href: `/admin/reseaux/${post.id}`,
            title: post.title,
            meta: `${post.client.name} · prévue ${formatSchedule(post.scheduledAt)}`,
            alert: Boolean(post.scheduledAt && post.scheduledAt < now),
          }))}
          more={waiting.length - LIST_LIMIT}
        />
        <Column
          title={`Créations en cours (${creations.length})`}
          empty="Aucune création demandée en cours."
          items={creations.slice(0, LIST_LIMIT).map((post) => ({
            id: post.id,
            href: `/admin/reseaux/${post.id}`,
            title: post.title,
            meta: `${post.client.name} · ${post.sourceTask?.status.label ?? ""}`,
          }))}
          more={creations.length - LIST_LIMIT}
        />
      </div>
      {missingLinks > 0 && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
          {missingLinks} publication{missingLinks > 1 ? "s" : ""} publiée{missingLinks > 1 ? "s" : ""} sans lien du
          post —{" "}
          <Link href="/admin/reseaux?statut=publie" className="underline underline-offset-2">
            à compléter
          </Link>
          .
        </p>
      )}
    </section>
  );
}
