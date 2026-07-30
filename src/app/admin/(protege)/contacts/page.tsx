import type { Metadata } from "next";
import Link from "next/link";
import { MagnifyingGlass, X, Phone, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ContactAccessBadge } from "@/components/admin/contact-access-badge";
import { contactAccessState, type ContactAccessState } from "@/lib/clients";
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

// Traduit le filtre d'état (dérivé de deux colonnes) en condition Prisma —
// voir `contactAccessState`, qui applique la même règle côté affichage.
function buildAccessWhere(access: string): Prisma.ClientUserWhereInput {
  if (access === "active") return { portalAccessEnabled: true, passwordHash: { not: null } };
  if (access === "pending") return { portalAccessEnabled: true, passwordHash: null };
  if (access === "none") return { portalAccessEnabled: false };
  return {};
}

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; acces?: string; client?: string }>;
}) {
  await verifyAdminSession();
  const { q, acces, client: clientFilter } = await searchParams;
  const search = q?.trim() ?? "";
  const access = acces ?? "";
  const clientId = clientFilter ?? "";

  const where: Prisma.ClientUserWhereInput = {
    // Le client de démonstration publique n'est pas un vrai client : son
    // "contact" est un compte technique, il n'a rien à faire au carnet
    // d'adresses (même raisonnement que `EXCLUDE_DEMO_CLIENT` ailleurs).
    client: { isDemo: false, ...(clientId ? { id: clientId } : {}) },
    ...buildAccessWhere(access),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { role: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [contacts, clients] = await Promise.all([
    db.clientUser.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
    }),
    db.client.findMany({
      where: { isDemo: false, users: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  function hrefWith(overrides: { q?: string; acces?: string; client?: string }) {
    const params = new URLSearchParams();
    const next = { q: search, acces: access, client: clientId, ...overrides };
    if (next.q) params.set("q", next.q);
    if (next.acces) params.set("acces", next.acces);
    if (next.client) params.set("client", next.client);
    const query = params.toString();
    return query ? `/admin/contacts?${query}` : "/admin/contacts";
  }

  const isFiltered = Boolean(search || access || clientId);
  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Contacts</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Tous les contacts, tous clients confondus. Un contact se crée et se modifie depuis la
        fiche de son client — cette page sert à le retrouver.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <form method="GET" action="/admin/contacts" className="flex flex-wrap items-center gap-2">
          {access && <input type="hidden" name="acces" value={access} />}
          {clientId && <input type="hidden" name="client" value={clientId} />}
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

        {clients.length > 1 && (
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
            {clients.map((client) => (
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

      {contacts.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">
          {isFiltered
            ? "Aucun contact ne correspond à cette recherche."
            : "Aucun contact pour le moment — ajoutez-en depuis une fiche client."}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-muted">
            {contacts.length} contact{contacts.length > 1 ? "s" : ""}
          </p>
          <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
            {contacts.map((contact) => {
              const state: ContactAccessState = contactAccessState(contact);
              return (
                <div
                  key={contact.id}
                  className="flex flex-wrap items-start justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {contact.name}
                      {contact.role && <span className="text-ink-muted">· {contact.role}</span>}
                      <ContactAccessBadge state={state} />
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-ink"
                        >
                          <EnvelopeSimple size={14} weight="regular" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <EnvelopeSimple size={14} weight="regular" />
                          Pas d&apos;email
                        </span>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone.replace(/\s/g, "")}`}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
                        >
                          <Phone size={14} weight="regular" />
                          {contact.phone}
                        </a>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/admin/clients/${contact.client.id}`}
                    className="shrink-0 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    {contact.client.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
