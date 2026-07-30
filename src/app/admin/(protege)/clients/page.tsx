import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientSortControl } from "@/components/admin/client-sort-control";
import { ClientFilterBar } from "@/components/admin/client-filter-bar";
import { ClientAvatar } from "@/components/admin/client-avatar";
import {
  isClientSortField,
  buildClientOrderBy,
  buildClientWhere,
  EXCLUDE_DEMO_CLIENT,
  type ClientSortField,
  type ClientSortDir,
} from "@/lib/clients";
import {
  CLIENT_CATEGORY_LIST_KEY,
  PALETTE_BADGE_CLASSES,
  type PaletteColor,
} from "@/lib/dropdown-lists";

export const metadata: Metadata = {
  title: "Clients — Admin Mikko Visuel",
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ tri?: string; dir?: string; q?: string; categorie?: string }>;
}) {
  await verifyAdminSession();
  const { tri, dir, q, categorie } = await searchParams;
  const sortField: ClientSortField = isClientSortField(tri) ? tri : "date_ajout";
  const sortDir: ClientSortDir = dir === "asc" ? "asc" : "desc";
  const search = q?.trim() ?? "";
  const categoryId = categorie ?? "";

  const [clients, categoryList, categoryCounts, uncategorizedCount] = await Promise.all([
    db.client.findMany({
      where: buildClientWhere({ search, categoryId }),
      orderBy: buildClientOrderBy(sortField, sortDir),
      include: { category: true },
    }),
    db.dropdownList.findUnique({
      where: { key: CLIENT_CATEGORY_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    // Compteurs des pastilles de filtre : volontairement calculés sur TOUS les
    // clients (hors démo), pas sur le résultat filtré — sinon cliquer une
    // catégorie ferait tomber à zéro le compteur de toutes les autres.
    db.client.groupBy({
      by: ["categoryId"],
      where: EXCLUDE_DEMO_CLIENT,
      _count: { _all: true },
    }),
    db.client.count({ where: { ...EXCLUDE_DEMO_CLIENT, categoryId: null } }),
  ]);

  const countByCategoryId = new Map(
    categoryCounts.map((row) => [row.categoryId, row._count._all]),
  );
  const categories = (categoryList?.items ?? [])
    .map((item) => ({
      id: item.id,
      label: item.label,
      color: item.color,
      count: countByCategoryId.get(item.id) ?? 0,
    }))
    // Une catégorie jamais utilisée n'apporte rien comme filtre — elle reste
    // visible et modifiable depuis /admin/listes.
    .filter((category) => category.count > 0);

  const isFiltered = Boolean(search || categoryId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Clients</h1>
        <Link
          href="/admin/clients/nouveau"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          <Plus size={16} weight="bold" />
          Nouveau client
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <ClientFilterBar
          search={search}
          categoryId={categoryId}
          sortField={sortField}
          sortDir={sortDir}
          categories={categories}
          uncategorizedCount={uncategorizedCount}
        />
        <ClientSortControl
          sortField={sortField}
          sortDir={sortDir}
          search={search}
          categoryId={categoryId}
        />
      </div>

      {clients.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">
          {isFiltered
            ? "Aucun client ne correspond à cette recherche."
            : "Aucun client pour le moment."}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-muted">
            {clients.length} client{clients.length > 1 ? "s" : ""}
            {isFiltered ? " correspondant" + (clients.length > 1 ? "s" : "") : ""}
          </p>
          <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-surface-elevated"
              >
                {/* Compteurs de contacts et de tâches retirés le 2026-07-30
                    (demande du client) : la ligne se limite à l'avatar, au nom
                    et à la catégorie. */}
                <div className="flex min-w-0 items-center gap-3">
                  <ClientAvatar
                    clientId={client.id}
                    name={client.name}
                    hasAvatar={Boolean(client.avatarStorageKey)}
                  />
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {client.name}
                    {client.category && (
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          PALETTE_BADGE_CLASSES[client.category.color as PaletteColor]
                        }`}
                      >
                        {client.category.label}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
