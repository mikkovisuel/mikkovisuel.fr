import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { GmailNotConnectedError, canModifyMail, inboxUnreadCount, listUserLabels } from "@/lib/gmail";
import { PageToolbar } from "@/components/admin/page-toolbar";
import { MailShell } from "@/components/admin/mail-shell";
import { startGmailConnection } from "@/lib/actions/gmail-auth";

// Onglet Mail (2026-10-21) : la boîte Gmail de l'admin connecté.
export default async function MailLayout({ children }: { children: React.ReactNode }) {
  await verifyAdminSession();

  let data: { labels: { id: string; name: string }[]; unread: number; canModify: boolean };
  try {
    const [labels, unread, canModify] = await Promise.all([listUserLabels(), inboxUnreadCount(), canModifyMail()]);
    data = { labels, unread, canModify };
  } catch (error) {
    const notConnected = error instanceof GmailNotConnectedError;
    return (
      <>
        <PageToolbar title="Mail" />
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <p className="text-lg text-ink">{notConnected ? "Gmail n'est pas connecté" : "Gmail ne répond pas"}</p>
          <p className="mt-2 text-sm text-ink-muted">
            {notConnected
              ? "Connectez votre compte Gmail pour lire et gérer vos e-mails ici."
              : "Réessayez dans un instant. Si le problème continue, reconnectez Gmail."}
          </p>
          <form action={startGmailConnection} className="mt-6">
            <button type="submit" className="h-10 rounded-full bg-accent px-6 text-sm font-medium text-accent-ink">
              Connecter Gmail
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <PageToolbar title="Mail" />
      {!data.canModify && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-outline)] px-4 py-3 text-sm sm:mx-6">
          <span className="flex-1 text-ink">
            Pour archiver, supprimer, marquer comme lu ou classer, autorisez le rangement : reconnectez Gmail une fois.
          </span>
          <form action={startGmailConnection}>
            <button type="submit" className="h-9 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink">
              Reconnecter Gmail
            </button>
          </form>
          <Link href="/admin/reglages" className="text-xs text-ink-muted underline">
            Réglages
          </Link>
        </div>
      )}
      <MailShell labels={data.labels} unread={data.unread}>
        {children}
      </MailShell>
    </>
  );
}
