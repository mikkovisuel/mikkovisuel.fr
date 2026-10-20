import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { PROSPECT_STATUS_LIST_KEY } from "@/lib/dropdown-lists";
import { ProspectTable } from "@/components/admin/prospect-table";
import { ProspectKanbanBoard } from "@/components/admin/prospect-kanban-board";
import { ProspectSearchForm } from "@/components/admin/prospect-search-form";
import { ProspectImportForm } from "@/components/admin/prospect-import-form";
import { FranceProspectMap } from "@/components/admin/france-prospect-map";
import { FilterMenu } from "@/components/admin/filter-menu";
import { buildRegionStats } from "@/lib/prospects";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";
import { getMyPreferences } from "@/lib/admin-preferences-server";
import { visibleColumns } from "@/lib/admin-preferences";

export const metadata: Metadata = {
  title: "Prospection — Admin Mikko Visuel",
};

export default async function ProspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ statusId?: string; q?: string; vue?: string }>;
}) {
  await verifyAdminSession();
  const params = await searchParams;
  const { statusId, q, vue } = params;
  const preferences = await getMyPreferences();
  // Vue par défaut du profil, en arrivant sans paramètre (2026-10-20).
  const requestedView = vue ?? (Object.keys(params).length === 0 ? preferences.views.prospection : undefined);
  const view = requestedView === "kanban" ? "kanban" : "liste";

  const [prospects, statusList, allProspectsForMap] = await Promise.all([
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
    // Carte de France : toujours l'ensemble des prospects, indépendamment du
    // filtre statut/recherche appliqué à la liste ci-dessous — voir
    // buildRegionStats.
    db.prospect.findMany({
      select: { city: true, status: { select: { slug: true, label: true, color: true } } },
    }),
  ]);

  const statusOptions = statusList?.items ?? [];
  const regionStats = buildRegionStats(allProspectsForMap);
  const hasFilters = Boolean(statusId || q);
  const hasAiSearch = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <>
      <PageToolbar title="Prospection">
        <Link
          href="/admin/prospection/nouveau"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Nouveau prospect
        </Link>
      </PageToolbar>
      <div className={PAGE_BODY}>
        <div className="mt-6">
          <FranceProspectMap regions={regionStats} />
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

          <nav className="segmented flex gap-2">
            {(["liste", "kanban"] as const).map((option) => {
              const params = new URLSearchParams();
              if (statusId) params.set("statusId", statusId);
              if (q) params.set("q", q);
              params.set("vue", option);
              const query = params.toString();
              return (
                <Link
                  key={option}
                  href={`/admin/prospection?${query}`}
                  aria-current={option === view ? "page" : undefined}
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
        ) : (
          <ProspectTable prospects={prospects} statuses={statusOptions} columns={visibleColumns(preferences, "prospects")} />
        )}
      </div>
    </>
  );
}
