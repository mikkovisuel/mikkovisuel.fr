import type { Metadata } from "next";
import Link from "next/link";
import { Envelope, EnvelopeOpen, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  searchThreadsAcrossClients,
  GmailNotConnectedError,
  type ClientEmailScope,
} from "@/lib/gmail";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";

export const metadata: Metadata = {
  title: "Mail — Admin Mikko Visuel",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminMailsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; clientId?: string }>;
}) {
  await verifyAdminSession();
  const { q, clientId } = await searchParams;

  const clients = await db.client.findMany({
    where: EXCLUDE_DEMO_CLIENT,
    include: { users: { orderBy: { createdAt: "asc" } } },
    orderBy: { name: "asc" },
  });

  const allScopes: ClientEmailScope[] = clients
    .filter((client) => client.users.length > 0)
    .map((client) => ({
      clientId: client.id,
      clientName: client.name,
      emails: client.users.map((user) => user.email),
    }));

  const scopes = clientId ? allScopes.filter((scope) => scope.clientId === clientId) : allScopes;

  let threads: Awaited<ReturnType<typeof searchThreadsAcrossClients>> = [];
  let notConnected = false;
  let loadError = false;

  try {
    threads = await searchThreadsAcrossClients(scopes, q);
  } catch (error) {
    if (error instanceof GmailNotConnectedError) {
      notConnected = true;
    } else {
      loadError = true;
    }
  }

  const hasFilters = Boolean(q || clientId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Mail — tous les clients
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Tous les échanges email avec vos clients, regroupés en un seul endroit.
      </p>

      {notConnected && (
        <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-line p-6">
          <p className="text-sm text-ink-muted">
            Gmail n&apos;est pas encore connecté à l&apos;admin.
          </p>
          <Link
            href="/admin/reglages"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
          >
            Connecter Gmail
          </Link>
        </div>
      )}

      {loadError && (
        <div className="mt-8 flex items-center gap-2 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          Impossible de charger les emails pour le moment.
        </div>
      )}

      {!notConnected && !loadError && (
        <>
          {allScopes.length === 0 ? (
            <p className="mt-8 text-sm text-ink-muted">
              Aucun client n&apos;a encore de compte de connexion (aucune adresse email à
              rechercher).
            </p>
          ) : (
            <>
              <form className="mt-8 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="q" className="text-sm font-medium text-ink">
                    Rechercher
                  </label>
                  <input
                    id="q"
                    name="q"
                    type="search"
                    defaultValue={q ?? ""}
                    placeholder="Mot-clé dans l'objet ou le corps du message"
                    className="w-72 rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="clientId" className="text-sm font-medium text-ink">
                    Client
                  </label>
                  <select
                    id="clientId"
                    name="clientId"
                    defaultValue={clientId ?? ""}
                    className="rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="">Tous les clients</option>
                    {allScopes.map((scope) => (
                      <option key={scope.clientId} value={scope.clientId}>
                        {scope.clientName}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
                >
                  Filtrer
                </button>
                {hasFilters && (
                  <Link
                    href="/admin/mails"
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    Réinitialiser
                  </Link>
                )}
              </form>

              {threads.length === 0 ? (
                <p className="mt-8 text-sm text-ink-muted">
                  {hasFilters
                    ? "Aucun email ne correspond à cette recherche."
                    : "Aucun email trouvé."}
                </p>
              ) : (
                <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
                  {threads.map((thread) => {
                    const content = (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 font-medium text-ink">
                            {thread.isUnread ? (
                              <Envelope
                                size={16}
                                weight="fill"
                                className="shrink-0 text-accent"
                                aria-label="Non lu"
                              />
                            ) : (
                              <EnvelopeOpen
                                size={16}
                                weight="regular"
                                className="shrink-0 text-ink-muted"
                                aria-label="Lu"
                              />
                            )}
                            {thread.subject}
                          </span>
                          <span className="shrink-0 text-xs text-ink-muted">
                            {thread.lastMessageDate
                              ? DATE_FORMATTER.format(thread.lastMessageDate)
                              : ""}
                          </span>
                        </div>
                        <p className="truncate pl-6 text-sm text-ink-muted">
                          {thread.clientName && (
                            <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-ink">
                              {thread.clientName}
                            </span>
                          )}{" "}
                          {thread.lastMessageFrom} — {thread.snippet}
                        </p>
                      </>
                    );

                    return thread.clientId ? (
                      <Link
                        key={thread.id}
                        href={`/admin/clients/${thread.clientId}/emails/${thread.id}`}
                        className="flex flex-col gap-1 px-6 py-4 transition-colors hover:bg-surface-elevated"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={thread.id} className="flex flex-col gap-1 px-6 py-4">
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
