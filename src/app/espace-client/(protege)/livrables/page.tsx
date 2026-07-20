import type { Metadata } from "next";
import Link from "next/link";
import { CaretUp, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { verifyClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { taskDateFormatterShort } from "@/lib/tasks";
import { FileGrid } from "@/components/file-grid";

export const metadata: Metadata = {
  title: "Livrables — Espace client Mikko Visuel",
};

type LivrablesSortField = "evenement" | "ajout";
type LivrablesSortDir = "asc" | "desc";

const SORT_FIELDS: { field: LivrablesSortField; label: string }[] = [
  { field: "evenement", label: "Date d'évènement" },
  { field: "ajout", label: "Date d'ajout" },
];

function sortHref(field: LivrablesSortField, activeField: LivrablesSortField, activeDir: LivrablesSortDir) {
  const nextDir: LivrablesSortDir = field === activeField && activeDir === "asc" ? "desc" : "asc";
  return `/espace-client/livrables?tri=${field}&dir=${nextDir}`;
}

export default async function ClientDeliverablesPage({
  searchParams,
}: {
  searchParams: Promise<{ tri?: string; dir?: string }>;
}) {
  const clientUser = await verifyClientSession();
  const { tri, dir } = await searchParams;
  const sortField: LivrablesSortField = tri === "evenement" ? "evenement" : "ajout";
  const sortDir: LivrablesSortDir = dir === "asc" ? "asc" : "desc";

  const tasks = await db.task.findMany({
    where: { clientId: clientUser.clientId, status: { slug: TASK_STATUS.TERMINE }, archivedAt: null },
    include: { deliverables: true },
    orderBy:
      sortField === "evenement"
        ? { eventDate: { sort: sortDir, nulls: "last" } }
        : { updatedAt: sortDir },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Livrables</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Les fichiers finaux de vos tâches terminées, disponibles au téléchargement.
          </p>
        </div>
        {tasks.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-ink-muted">Trier par</span>
            {SORT_FIELDS.map(({ field, label }) => {
              const isActive = field === sortField;
              return (
                <Link
                  key={field}
                  href={sortHref(field, sortField, sortDir)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition-colors ${
                    isActive
                      ? "border-accent bg-accent/10 text-ink"
                      : "border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                  {isActive &&
                    (sortDir === "asc" ? (
                      <CaretUp size={11} weight="bold" />
                    ) : (
                      <CaretDown size={11} weight="bold" />
                    ))}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucun livrable pour le moment.</p>
      ) : (
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {tasks.map((task) => (
            <details key={task.id} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="font-medium text-ink">
                  {task.eventDate && (
                    <span className="mr-2 font-normal text-ink-muted">
                      {taskDateFormatterShort.format(task.eventDate)} —
                    </span>
                  )}
                  {task.title}
                </span>
                <span className="shrink-0 text-sm text-ink-muted">
                  {task.deliverables.length} fichier{task.deliverables.length > 1 ? "s" : ""}
                </span>
              </summary>
              <div className="mt-4">
                {task.deliverables.length === 0 ? (
                  <p className="text-sm text-ink-muted">Aucun fichier déposé pour l&apos;instant.</p>
                ) : (
                  <FileGrid files={task.deliverables} downloadBasePath="/api/fichiers/livrables" />
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
