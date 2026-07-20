import { EnvelopeSimple, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { startGmailConnection, disconnectGmail } from "@/lib/actions/gmail-auth";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function GmailConnectionCard({
  gmailEmail,
  gmailConnectedAt,
}: {
  gmailEmail: string | null;
  gmailConnectedAt: Date | null;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium text-ink">Boîte mail</h2>
      <p className="text-xs text-ink-muted">
        Connecte ton compte Gmail pour voir et répondre aux emails de chaque client directement
        depuis l&apos;admin, sans ouvrir Gmail.
      </p>

      {gmailEmail ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
          <span className="flex items-center gap-2 text-sm text-ink">
            <CheckCircle size={18} weight="fill" className="text-accent" />
            Connecté : <span className="font-medium">{gmailEmail}</span>
            {gmailConnectedAt && (
              <span className="text-xs text-ink-muted">
                depuis le {DATE_FORMATTER.format(gmailConnectedAt)}
              </span>
            )}
          </span>
          <form action={disconnectGmail}>
            <button
              type="submit"
              className="text-xs text-ink-muted transition-colors hover:text-danger"
            >
              Déconnecter
            </button>
          </form>
        </div>
      ) : (
        <form action={startGmailConnection}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
          >
            <EnvelopeSimple size={16} weight="regular" />
            Connecter Gmail
          </button>
        </form>
      )}
    </section>
  );
}
