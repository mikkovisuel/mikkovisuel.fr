import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { PROSPECT_STATUS_LIST_KEY } from "@/lib/dropdown-lists";
import { ProspectRow } from "@/components/admin/prospect-row";
import { ProspectKanbanBoard } from "@/components/admin/prospect-kanban-board";
import { ProspectSearchForm } from "@/components/admin/prospect-search-form";
import { ProspectImportForm } from "@/components/admin/prospect-import-form";
import { FilterMenu } from "@/components/admin/filter-menu";

export const metadata: Metadata = {
  title: "Prospection — Admin Mikko Visuel",
};

export default async function ProspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ statusId?: string; q?: string; vue?: string }>;
}) {
  await verifyAdminSession();
  const { statusId, q, vue } = await searchParams;
  const view = vue === "kanban" ? "kanban" : "liste";

  const [prospects, statusList] = await Promise.all([
    db.prospect.findMany({
      where: {
        ...(statusId ? { statusId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { company: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { status: true, convertedClient: true },
      orderBy: { createdAt: "desc" },
    }),
    db.dropdownList.findUnique({
      where: { key: PROSPECT_STATUS_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const statusOptions = statusList?.items ?? [];
  const hasFilters = Boolean(statusId || q);
  const hasAiSearch = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Prospection</h1>
        <Link
          href="/admin/prospection/nouveau"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Nouveau prospect
        </Link>
      </div>

      {hasAiSearch ? (
        <div className="mt-6">
          <ProspectSearchForm />
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-line p-4 text-sm text-ink-muted">
          Recherche automatique de prospects désactivée : configurez la variable d&apos;environnement{" "}
          <code className="rounded bg-surface-elevated px-1.5 py-0.5">ANTHROPIC_API_KEY</code> pour
          l&apos;activer.
        </p>
      )}

      <div className="mt-3">
        <ProspectImportForm />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <FilterMenu activeCount={[statusId, q].filter(Boolean).length} label="Filtres">
          <form className="grid gap-3">
            <input type="hidden" name="vue" value={view} />
            <div className="flex flex-col gap-2">
              <label htmlFor="q" className="text-sm font-medium text-ink">
                Recherche
              </label>
              <input
                id="q"
                name="q"
                type="text"
                defaultValue={q ?? ""}
                placeholder="Nom, entreprise..."
                className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="statusId" className="text-sm font-medium text-ink">
                Statut
              </label>
              <select
                id="statusId"
                name="statusId"
                defaultValue={statusId ?? ""}
                className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Tous les statuts</option>
                {statusOptions.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
              >
                Appliquer
              </button>
              {hasFilters && (
                <Link
                  href={view === "kanban" ? "/admin/prospection?vue=kanban" : "/admin/prospection"}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Réinitialiser
                </Link>
              )}
            </div>
          </form>
        </FilterMenu>

        <nav className="flex gap-2">
          {(["liste", "kanban"] as const).map((option) => {
            const params = new URLSearchParams();
            if (statusId) params.set("statusId", statusId);
            if (q) params.set("q", q);
            if (option !== "liste") params.set("vue", option);
            const query = params.toString();
            return (
              <Link
                key={option}
                href={query ? `/admin/prospection?${query}` : "/admin/prospection"}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  option === view
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {option === "liste" ? "Liste" : "Kanban"}
              </Link>
            );
          })}
        </nav>
      </div>

      {view === "kanban" ? (
        <ProspectKanbanBoard prospects={prospects} statuses={statusOptions} />
      ) : prospects.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucun prospect pour le moment.</p>
      ) : (
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {prospects.map((prospect) => (
            <ProspectRow key={prospect.id} prospect={prospect} />
          ))}
        </div>
      )}
    </div>
  );
}
