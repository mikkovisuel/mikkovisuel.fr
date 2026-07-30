import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Envelope,
  EnvelopeOpen,
  EnvelopeSimple,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { searchThreadsForEmails, GmailNotConnectedError } from "@/lib/gmail";
import { sendNewMessage } from "@/lib/actions/gmail-messages";
import { EmailComposer } from "@/components/admin/email-composer";

export const metadata: Metadata = {
  title: "Emails — Admin Mikko Visuel",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ClientEmailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await verifyAdminSession();
  const { clientId } = await params;
  const { q } = await searchParams;

  const client = await db.client.findUnique({
    where: { id: clientId },
    include: { users: { orderBy: { createdAt: "asc" } } },
  });
  if (!client) notFound();

  // Seuls les contacts ayant une adresse peuvent apparaître dans une
  // recherche Gmail — les contacts "téléphone uniquement" sont écartés.
  const emails = client.users.flatMap((user) => (user.email ? [user.email] : []));
  const sendNewMessageForThisClient = sendNewMessage.bind(null, clientId);

  let threads: Awaited<ReturnType<typeof searchThreadsForEmails>> = [];
  let notConnected = false;
  let loadError = false;

  try {
    threads = await searchThreadsForEmails(emails, q);
  } catch (error) {
    if (error instanceof GmailNotConnectedError) {
      notConnected = true;
    } else {
      loadError = true;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/admin/clients/${client.id}`}
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour à {client.name}
      </Link>

      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">
        Emails — {client.name}
      </h1>

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
          {emails.length > 0 && (
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
              <button
                type="submit"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
              >
                Filtrer
              </button>
              {q && (
                <Link
                  href={`/admin/clients/${client.id}/emails`}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Réinitialiser
                </Link>
              )}
            </form>
          )}

          {emails.length === 0 ? (
            <p className="mt-8 text-sm text-ink-muted">
              Ce client n&apos;a pas encore de compte de connexion (aucune adresse email à
              rechercher).
            </p>
          ) : threads.length === 0 ? (
            <p className="mt-8 text-sm text-ink-muted">
              {q ? "Aucun email ne correspond à cette recherche." : "Aucun email trouvé avec ce client."}
            </p>
          ) : (
            <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/admin/clients/${client.id}/emails/${thread.id}`}
                  className="flex flex-col gap-1 px-6 py-4 transition-colors hover:bg-surface-elevated"
                >
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
                      {thread.lastMessageDate ? DATE_FORMATTER.format(thread.lastMessageDate) : ""}
                    </span>
                  </div>
                  <p className="truncate pl-6 text-sm text-ink-muted">
                    {thread.lastMessageFrom} — {thread.snippet}
                  </p>
                </Link>
              ))}
            </div>
          )}

          <section className="mt-12 border-t border-line pt-8">
            <h2 className="flex items-center gap-2 text-sm font-medium text-ink-muted">
              <EnvelopeSimple size={16} weight="regular" />
              Nouveau message
            </h2>
            <div className="mt-4">
              <EmailComposer
                action={sendNewMessageForThisClient}
                toDefaultValue={emails[0]}
                submitLabel="Envoyer"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
