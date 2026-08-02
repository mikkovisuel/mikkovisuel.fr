import type { Metadata } from "next";
import Link from "next/link";
import { MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { FilterMenu } from "@/components/admin/filter-menu";
import { GlobalContactRow } from "@/components/admin/global-contact-row";
import { NewContactButton } from "@/components/admin/new-contact-button";
import {
  createClientContactAnyClient,
  deleteContactPermanently,
  updateClientContact,
} from "@/lib/actions/clients";
import { OrphanContactRow } from "@/components/admin/orphan-contact-row";
import { contactAccessState, type ContactAccessState } from "@/lib/clients";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Contacts — Admin Mikko Visuel",
};

const ACCESS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "active", label: "Espace client actif" },
  { value: "pending", label: "Invitation à envoyer" },
  { value: "none", label: "Contact seul" },
];

// "nom" par défaut (demande explicite du 2026-07-31) — "date_ajout" reste
// disponible mais n'est plus le tri d'ouverture.
type ContactSortField = "nom" | "date_ajout";

// Traduit le filtre d'état (dérivé de deux colonnes) en condition Prisma —
// voir `contactAccessState`, qui applique la même règle côté affichage.
function buildAccessWhere(access: string): Prisma.ClientContactWhereInput {
  if (access === "active") return { portalAccessEnabled: true, passwordHash: { not: null } };
  if (access === "pending") return { portalAccessEnabled: true, passwordHash: null };
  if (access === "none") return { portalAccessEnabled: false };
  return {};
}

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; acces?: string; client?: string; tri?: string; sansClient?: string }>;
}) {
  await verifyAdminSession();
  const { q, acces, client: clientFilter, tri, sansClient: sansClientParam } = await searchParams;
  const search = q?.trim() ?? "";
  const access = acces ?? "";
  const clientId = clientFilter ?? "";
  const sortField: ContactSortField = tri === "date_ajout" ? "date_ajout" : "nom";
  // Contacts "orphelins" (2026-08-02, "possible de supprimer définitivement
  // un contact ?") : un contact retiré de son dernier client reste en base
  // mais ne s'affiche jusqu'ici nulle part (cette page ne liste que des
  // rattachements) — ce filtre les rend enfin trouvables, pour les
  // réaffecter ou les supprimer pour de bon.
  const sansClient = sansClientParam === "1";

  const where: Prisma.ClientContactWhereInput = {
    // Le client de démonstration publique n'est pas un vrai client : son
    // "contact" est un compte technique, il n'a rien à faire au carnet
    // d'adresses (même raisonnement que `EXCLUDE_DEMO_CLIENT` ailleurs).
    client: { isDemo: false, ...(clientId ? { id: clientId } : {}) },
    ...buildAccessWhere(access),
    ...(search
      ? {
          contact: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { role: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [contacts, clientsWithContacts, allClients, allContacts, orphanContacts, orphanCount] = await Promise.all([
    db.clientContact.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        // `clientLinks` inclus pour avertir avant suppression définitive si
        // ce contact est rattaché à plus d'un client (voir GlobalContactRow).
        contact: { include: { clientLinks: { include: { client: { select: { name: true } } } } } },
      },
      orderBy:
        sortField === "nom" ? [{ contact: { name: "asc" } }] : [{ createdAt: "desc" }],
    }),
    db.client.findMany({
      where: { isDemo: false, contacts: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Pour le sélecteur de client du bouton "Créer un contact" — tous les
    // clients actifs, pas seulement ceux ayant déjà un contact (à la
    // différence de `clientsWithContacts`, utilisé pour le filtre).
    db.client.findMany({ where: ACTIVE_CLIENTS, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // Pour le mode "Affecter un contact existant" du même bouton.
    db.contact.findMany({ orderBy: { name: "asc" } }),
    // Filtre "Sans client" : contacts rattachés à zéro client.
    sansClient
      ? db.contact.findMany({
          where: { clientLinks: { none: {} } },
          orderBy: sortField === "nom" ? { name: "asc" } : { createdAt: "desc" },
        })
      : Promise.resolve([]),
    db.contact.count({ where: { clientLinks: { none: {} } } }),
  ]);

  function hrefWith(overrides: {
    q?: string;
    acces?: string;
    client?: string;
    tri?: string;
    sansClient?: boolean;
  }) {
    const params = new URLSearchParams();
    const next = {
      q: search,
      acces: access,
      client: clientId,
      tri: sortField,
      sansClient,
      ...overrides,
    };
    if (next.q) params.set("q", next.q);
    if (next.acces) params.set("acces", next.acces);
    if (next.client) params.set("client", next.client);
    if (next.tri && next.tri !== "nom") params.set("tri", next.tri);
    if (next.sansClient) params.set("sansClient", "1");
    const query = params.toString();
    return query ? `/admin/contacts?${query}` : "/admin/contacts";
  }

  const isFiltered = Boolean(search || access || clientId);
  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors";

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Contacts</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Tous les contacts, tous clients confondus — un même contact peut être affecté à
            plusieurs clients.
          </p>
        </div>
        {/* Bouton "Créer un contact" ajouté le 2026-07-31 (demande
            explicite) : jusque-là, un contact ne pouvait se créer que
            depuis la fiche d'un client précis. */}
        <NewContactButton
          action={createClientContactAnyClient}
          clients={allClients}
          existingContacts={allContacts}
        />
      </div>

      {/* Filtre "Sans client" (2026-08-02) : un contact retiré de son dernier
          client restait jusqu'ici invisible partout dans l'admin — ce lien
          le rend trouvable, pour le réaffecter ou le supprimer pour de bon. */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        {sansClient ? (
          <Link href={hrefWith({ sansClient: false })} className="text-ink-muted underline hover:text-ink">
            ← Retour aux contacts
          </Link>
        ) : (
          orphanCount > 0 && (
            <Link
              href={hrefWith({ sansClient: true })}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              Sans client
              <span className="rounded-full bg-surface-elevated px-1.5 text-xs">{orphanCount}</span>
            </Link>
          )
        )}
      </div>

      {sansClient ? (
        <>
          <p className="mt-6 text-sm text-ink-muted">
            Contacts rattachés à aucun client — probablement retirés d&apos;un client sans être
            réaffectés ailleurs. Réaffectez-les ou supprimez-les définitivement.
          </p>
          {orphanContacts.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Aucun contact orphelin pour le moment.</p>
          ) : (
            <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {orphanContacts.map((contact) => (
                <OrphanContactRow
                  key={contact.id}
                  contact={contact}
                  clients={allClients}
                  assignAction={createClientContactAnyClient}
                  deleteAction={deleteContactPermanently.bind(null, contact.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <form method="GET" action="/admin/contacts" className="flex flex-wrap items-center gap-2">
              {access && <input type="hidden" name="acces" value={access} />}
              {clientId && <input type="hidden" name="client" value={clientId} />}
              {sortField !== "nom" && <input type="hidden" name="tri" value={sortField} />}
              <div className="relative flex-1 sm:max-w-xs">
                <MagnifyingGlass
                  size={16}
                  weight="regular"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={search}
                  placeholder="Nom, email, téléphone, fonction..."
                  aria-label="Rechercher un contact"
                  className="w-full rounded-full border border-line bg-surface-elevated py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <button
                type="submit"
                className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
              >
                Rechercher
              </button>
              {isFiltered && (
                <Link
                  href="/admin/contacts"
                  className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  <X size={14} weight="bold" />
                  Tout effacer
                </Link>
              )}
            </form>

            <FilterMenu activeCount={[access, clientId].filter(Boolean).length} label="Filtres">
              <div className="grid gap-4">
                {/* Tri alphabétique / date d'ajout (demande du 2026-07-31,
                    alphabétique par défaut). */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm text-ink-muted">Trier par</span>
                  <Link
                    href={hrefWith({ tri: "nom" })}
                    className={`${chipBase} ${
                      sortField === "nom"
                        ? "border-accent bg-accent/10 text-ink"
                        : "border-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    Alphabétique
                  </Link>
                  <Link
                    href={hrefWith({ tri: "date_ajout" })}
                    className={`${chipBase} ${
                      sortField === "date_ajout"
                        ? "border-accent bg-accent/10 text-ink"
                        : "border-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    Date d&apos;ajout
                  </Link>
                </div>

                <div className="h-px bg-line" />

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm text-ink-muted">Accès</span>
                  {ACCESS_FILTERS.map((filter) => (
                    <Link
                      key={filter.value || "tous"}
                      href={hrefWith({ acces: filter.value })}
                      className={`${chipBase} ${
                        access === filter.value
                          ? "border-accent bg-accent/10 text-ink"
                          : "border-line text-ink-muted hover:text-ink"
                      }`}
                    >
                      {filter.label}
                    </Link>
                  ))}
                </div>

                {clientsWithContacts.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm text-ink-muted">Client</span>
                    <Link
                      href={hrefWith({ client: "" })}
                      className={`${chipBase} ${
                        clientId
                          ? "border-line text-ink-muted hover:text-ink"
                          : "border-accent bg-accent/10 text-ink"
                      }`}
                    >
                      Tous
                    </Link>
                    {clientsWithContacts.map((client) => (
                      <Link
                        key={client.id}
                        href={hrefWith({ client: client.id })}
                        className={`${chipBase} ${
                          clientId === client.id
                            ? "border-accent bg-accent/10 text-ink"
                            : "border-line text-ink-muted hover:text-ink"
                        }`}
                      >
                        {client.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </FilterMenu>
          </div>

          {contacts.length === 0 ? (
            <p className="mt-8 text-sm text-ink-muted">
              {isFiltered
                ? "Aucun contact ne correspond à cette recherche."
                : "Aucun contact pour le moment — créez-en un, ou depuis une fiche client."}
            </p>
          ) : (
            <>
              <p className="mt-6 text-sm text-ink-muted">
                {contacts.length} contact{contacts.length > 1 ? "s" : ""}
              </p>
              <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
                {contacts.map((link) => {
                  const state: ContactAccessState = contactAccessState(link);
                  return (
                    <GlobalContactRow
                      key={link.id}
                      contact={{
                        id: link.id,
                        name: link.contact.name,
                        email: link.contact.email,
                        phone: link.contact.phone,
                        role: link.contact.role,
                      }}
                      clientName={link.client.name}
                      clientHref={`/admin/clients/${link.client.id}`}
                      accessState={state}
                      editAction={updateClientContact.bind(null, link.id, link.client.id)}
                      deleteAction={deleteContactPermanently.bind(null, link.contact.id)}
                      linkedClientNames={link.contact.clientLinks.map((l) => l.client.name)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
