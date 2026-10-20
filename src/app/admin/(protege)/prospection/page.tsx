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
import { ModalTrigger } from "@/components/admin/client-block-editor";
import { guessRegionSlug } from "@/lib/france-regions";
import { PALETTE_SWATCH_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";
import { MagnifyingGlass, Sparkle, UploadSimple, X } from "@phosphor-icons/react/dist/ssr";
import { buildRegionStats } from "@/lib/prospects";
import { PageToolbar } from "@/components/admin/page-toolbar";
import { getMyPreferences } from "@/lib/admin-preferences-server";
import { visibleColumns } from "@/lib/admin-preferences";

export const metadata: Metadata = {
  title: "Prospection — Admin Mikko Visuel",
};

// Prospection façon « carte + liste » de Google Maps (maquette B validée le
// 2026-10-20) : chiffres en tête, puis la liste à gauche (onglets de statut,
// recherche) et la carte de France à droite — un clic sur une région filtre
// la liste. Recherche IA et import passent en boutons de la barre d'outils,
// dans une fenêtre. La vue Kanban occupe toute la largeur.

const PILL =
  "inline-flex h-9 items-center gap-2 rounded-full border border-[var(--color-outline)] px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]";

export default async function ProspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ statusId?: string; q?: string; vue?: string; region?: string }>;
}) {
  await verifyAdminSession();
  const params = await searchParams;
  const { statusId, q, vue, region } = params;
  const preferences = await getMyPreferences();
  // Vue par défaut du profil, en arrivant sans paramètre (2026-10-20).
  const requestedView = vue ?? (Object.keys(params).length === 0 ? preferences.views.prospection : undefined);
  const view = requestedView === "kanban" ? "kanban" : "liste";

  const [allProspects, statusList] = await Promise.all([
    db.prospect.findMany({
      include: { status: true, convertedClient: true },
      orderBy: { createdAt: "desc" },
    }),
    db.dropdownList.findUnique({
      where: { key: PROSPECT_STATUS_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const statusOptions = statusList?.items ?? [];
  const hasAiSearch = Boolean(process.env.ANTHROPIC_API_KEY);
  const now = new Date();
  const year = now.getFullYear();

  // Chiffres de l'en-tête, toujours sur l'ensemble des prospects.
  const activeCount = allProspects.filter(
    (prospect) => !["ferme", "archive"].includes(prospect.status.slug) && !prospect.convertedClientId,
  ).length;
  const dueCount = allProspects.filter(
    (prospect) => prospect.nextReminderAt && prospect.nextReminderAt <= now && !prospect.reminderSentAt,
  ).length;
  const discussionCount = allProspects.filter((prospect) => prospect.status.slug === "discussions-en-cours").length;
  const convertedThisYear = allProspects.filter((prospect) => prospect.convertedAt?.getFullYear() === year).length;
  const createdThisYear = allProspects.filter((prospect) => prospect.createdAt.getFullYear() === year).length;
  const conversionRate = createdThisYear > 0 ? Math.round((convertedThisYear / createdThisYear) * 100) : null;

  // Filtres : région (carte), recherche, puis statut (onglets). Les
  // compteurs des onglets tiennent compte de la région et de la recherche.
  const regionStats = buildRegionStats(allProspects);
  const selectedRegion = regionStats.find((item) => item.slug === region) ?? null;
  const needle = q?.trim().toLowerCase() ?? "";
  const scoped = allProspects.filter(
    (prospect) =>
      (!selectedRegion || guessRegionSlug(prospect.city) === selectedRegion.slug) &&
      (!needle ||
        [prospect.name, prospect.company, prospect.city, prospect.activityLevel].some((value) =>
          value?.toLowerCase().includes(needle),
        )),
  );
  const prospects = statusId ? scoped.filter((prospect) => prospect.statusId === statusId) : scoped;

  const keep: Record<string, string> = {
    ...(view === "kanban" ? { vue: "kanban" } : { vue: "liste" }),
    ...(q ? { q } : {}),
    ...(selectedRegion ? { region: selectedRegion.slug } : {}),
    ...(statusId ? { statusId } : {}),
  };
  const hrefWith = (overrides: Record<string, string | undefined>) => {
    const search = new URLSearchParams(keep);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    return `/admin/prospection?${search.toString()}`;
  };

  const kpis = [
    { label: "Prospects actifs", value: String(activeCount) },
    { label: "Relances dues", value: String(dueCount), alert: dueCount > 0 },
    { label: "En discussion", value: String(discussionCount) },
    {
      label: `Convertis en ${year}`,
      value: String(convertedThisYear),
      hint: conversionRate !== null ? `${conversionRate} % des prospects de l'année` : undefined,
    },
  ];

  const tabs = [
    { id: undefined as string | undefined, label: "Tous", color: null as string | null, count: scoped.length },
    ...statusOptions.map((status) => ({
      id: status.id,
      label: status.label,
      color: status.color,
      count: scoped.filter((prospect) => prospect.statusId === status.id).length,
    })),
  ];

  return (
    <>
      <PageToolbar
        title="Prospection"
        subtitle={`${allProspects.length} prospect${allProspects.length > 1 ? "s" : ""}`}
      >
        {hasAiSearch && (
          <ModalTrigger
            title="Rechercher des prospects (IA)"
            label="Recherche IA"
            className={PILL}
            content={<ProspectSearchForm embedded />}
          >
            <Sparkle size={16} />
            Recherche IA
          </ModalTrigger>
        )}
        <ModalTrigger title="Importer des prospects" label="Importer" className={PILL} content={<ProspectImportForm embedded />}>
          <UploadSimple size={16} />
          Importer
        </ModalTrigger>
        <Link
          href="/admin/prospection/nouveau"
          className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Nouveau prospect
        </Link>
      </PageToolbar>

      <div className="grid grid-cols-2 gap-3 px-4 pt-5 sm:px-6 lg:px-8 xl:grid-cols-4 2xl:px-12">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-xl px-4 py-3 ${kpi.alert ? "bg-red-500/10" : "bg-surface-elevated"}`}>
            <p className="text-sm text-ink-muted">{kpi.label}</p>
            <p className={`mt-1 text-2xl tabular-nums ${kpi.alert ? "text-danger" : "text-ink"}`}>{kpi.value}</p>
            {kpi.hint && <p className="text-xs text-ink-muted">{kpi.hint}</p>}
          </div>
        ))}
      </div>
      {!hasAiSearch && (
        <p className="px-4 pt-3 text-xs text-ink-muted sm:px-6 lg:px-8 2xl:px-12">
          Recherche IA désactivée : variable <code>ANTHROPIC_API_KEY</code> absente.
        </p>
      )}

      <div
        className={`mt-5 grid border-t border-line ${
          view === "liste" ? "min-[1200px]:grid-cols-[minmax(0,1fr)_24rem]" : ""
        }`}
      >
        <div className="min-w-0">
          <nav aria-label="Statuts" className="flex overflow-x-auto border-b border-line px-2 [scrollbar-width:none] sm:px-4">
            {tabs.map((tab) => {
              const active = (statusId ?? undefined) === tab.id;
              return (
                <Link
                  key={tab.id ?? "tous"}
                  href={hrefWith({ statusId: tab.id })}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-12 shrink-0 items-center gap-2 px-3 text-sm transition-colors hover:bg-ink/[0.04] ${
                    active ? "font-medium text-ink" : "text-ink-muted"
                  } ${tab.count === 0 && !active ? "opacity-60" : ""}`}
                >
                  {tab.color && (
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        PALETTE_SWATCH_CLASSES[tab.color as PaletteColor] ?? PALETTE_SWATCH_CLASSES.slate
                      }`}
                    />
                  )}
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-xs tabular-nums ${
                        active ? "bg-accent text-accent-ink" : "bg-ink/[0.08] text-ink-muted"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[3px] bg-[var(--color-accent-strong)]" aria-hidden />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <form className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-full bg-search px-3 sm:max-w-sm">
              {Object.entries(keep)
                .filter(([key]) => key !== "q")
                .map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
              <MagnifyingGlass size={16} className="shrink-0 text-ink-muted" />
              <input
                name="q"
                type="search"
                defaultValue={q ?? ""}
                placeholder="Nom, entreprise, ville, activité…"
                aria-label="Rechercher un prospect"
                className="h-9 w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </form>
            {selectedRegion && (
              <Link
                href={hrefWith({ region: undefined })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-select px-3 text-sm font-medium text-ink"
                title="Retirer le filtre de région"
              >
                {selectedRegion.label}
                <X size={14} weight="bold" />
              </Link>
            )}
            <nav className="segmented ml-auto" aria-label="Vue">
              {(["liste", "kanban"] as const).map((option) => (
                <Link key={option} href={hrefWith({ vue: option })} aria-current={option === view ? "page" : undefined}>
                  {option === "liste" ? "Liste" : "Kanban"}
                </Link>
              ))}
            </nav>
          </div>

          {view === "kanban" ? (
            <div className="px-4 pb-6 sm:px-6 lg:px-8">
              <ProspectKanbanBoard prospects={prospects} statuses={statusOptions} />
            </div>
          ) : (
            <ProspectTable
              prospects={prospects}
              statuses={statusOptions}
              columns={visibleColumns(preferences, "prospects")}
              emptyMessage={
                needle || selectedRegion || statusId ? "Aucun prospect ne correspond à ces filtres." : "Aucun prospect pour le moment."
              }
            />
          )}
        </div>

        {view === "liste" && (
          <aside className="border-t border-line bg-surface-elevated/40 p-4 min-[1200px]:border-l min-[1200px]:border-t-0 lg:rounded-br-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Par région</h2>
            <div className="mt-3">
              <FranceProspectMap
                compact
                regions={regionStats}
                selectedSlug={selectedRegion?.slug ?? null}
                filter={{ basePath: "/admin/prospection", params: keep }}
              />
            </div>
            <ul className="mt-4 grid gap-0.5 text-sm">
              {regionStats
                .filter((item) => item.total > 0)
                .sort((a, b) => b.total - a.total)
                .map((item) => {
                  const active = selectedRegion?.slug === item.slug;
                  return (
                    <li key={item.slug}>
                      <Link
                        href={hrefWith({ region: active ? undefined : item.slug })}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                          active ? "bg-select font-medium text-ink" : "text-ink hover:bg-ink/[0.06]"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <span className="text-xs tabular-nums text-ink-muted">{item.total}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </aside>
        )}
      </div>
    </>
  );
}
