import type { Metadata } from "next";
import Link from "next/link";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TaskStatusTimeline } from "@/components/client/task-status-timeline";
import { TASK_STATUS_LIST_KEY } from "@/lib/dropdown-lists";

export const metadata: Metadata = {
  title: "Suivi — Espace client Mikko Visuel",
};

export default async function ClientFollowUpPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const clientUser = await verifyClientSession();
  const { statut } = await searchParams;

  const [tasks, statusList] = await Promise.all([
    db.task.findMany({
      where: {
        clientId: clientUser.clientId,
        archivedAt: null,
        ...(statut ? { status: { slug: statut } } : {}),
      },
      include: { status: true },
      orderBy: { createdAt: "desc" },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_STATUS_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Suivi</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/espace-client/suivi"
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            !statut
              ? "border-accent bg-accent text-accent-ink"
              : "border-line text-ink-muted hover:text-ink"
          }`}
        >
          Tous
        </Link>
        {statusList?.items.map((item) => (
          <Link
            key={item.slug}
            href={`/espace-client/suivi?statut=${item.slug}`}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              statut === item.slug
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucune tâche pour ce filtre.</p>
      ) : (
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {tasks.map((task) => (
            <div key={task.id} className="px-6 py-4">
              <Link
                href={`/espace-client/taches/${task.id}`}
                className="font-medium text-ink hover:underline"
              >
                {task.title}
              </Link>
              <div className="mt-3">
                <TaskStatusTimeline statusSlug={task.status.slug} refusalReason={task.refusalReason} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
