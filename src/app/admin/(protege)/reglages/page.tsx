import type { Metadata } from "next";
import Link from "next/link";
import { WarningCircle, CheckCircle, ShieldWarning } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { SettingsForm } from "@/components/admin/settings-form";
import { GmailConnectionCard } from "@/components/admin/gmail-connection-card";
import { ClientUserEmailToggle } from "@/components/admin/client-user-email-toggle";
import { AdminAccountsPanel } from "@/components/admin/admin-accounts-panel";

export const metadata: Metadata = {
  title: "Réglages — Admin Mikko Visuel",
};

const SECURITY_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// `new Date()`/`Date.now()` directement dans le corps du composant serait
// flaggé par la règle react-hooks/purity (appel impur pendant le rendu) —
// même contournement que `startOfToday()` dans src/lib/tasks.ts : cacher
// l'appel dans une fonction à part.
function getSevenDaysAgo(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const admin = await verifyAdminSession();
  const settings = await getAppSettings();
  const { gmail } = await searchParams;

  const clients = await db.client.findMany({
    // Seuls les contacts ayant un accès ouvert : les notifications parlent
    // toutes de "votre espace client", proposer de les activer pour un simple
    // contact du carnet d'adresses n'aurait pas de sens.
    where: { ...EXCLUDE_DEMO_CLIENT, users: { some: { portalAccessEnabled: true } } },
    include: {
      users: { where: { portalAccessEnabled: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  // Tentatives de connexion échouées des 7 derniers jours — la table
  // `LoginAttempt` sert déjà à bloquer le brute-force (voir src/lib/
  // rate-limit.ts), mais rien ne l'affichait jusqu'ici. Utile pour un admin
  // seul détenteur de l'accès à toutes les données clients : un signal
  // simple si quelqu'un tente de deviner le mot de passe.
  const sevenDaysAgo = getSevenDaysAgo();
  const recentFailedAttempts = await db.loginAttempt.findMany({
    where: { succeeded: false, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const adminFailedCount = recentFailedAttempts.filter(
    (attempt) => attempt.identifier === admin.email.toLowerCase(),
  ).length;

  const admins = await db.admin.findMany({
    select: { id: true, email: true, lastLoginAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Réglages</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Paramètres appliqués en direct sur l&apos;ensemble des espaces clients.
      </p>

      {gmail === "connected" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink">
          <CheckCircle size={16} weight="fill" className="text-accent" />
          Gmail connecté avec succès.
        </div>
      )}
      {gmail === "error" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          La connexion à Gmail a échoué. Réessaie, ou vérifie les identifiants Google configurés.
        </div>
      )}
      {gmail === "not-configured" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          Les identifiants Google (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI) ne
          sont pas encore configurés côté serveur.
        </div>
      )}

      <div className="mt-8">
        <GmailConnectionCard gmailEmail={admin.gmailEmail} gmailConnectedAt={admin.gmailConnectedAt} />
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <SettingsForm
          defaultValues={{
            deliverableRetentionDays: settings.deliverableRetentionDays,
            batWatermarkEnabled: settings.batWatermarkEnabled,
            popupEnabled: settings.popupEnabled,
            popupMessage: settings.popupMessage ?? "",
            prospectReminderDefaultDays: settings.prospectReminderDefaultDays,
          }}
        />
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">
          Mode d&apos;emploi client
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Guide PDF illustré expliquant chaque onglet de l&apos;espace client, dans la charte du
          site — à télécharger et transmettre à vos clients.
        </p>
        <a
          href="/api/exports/guide"
          className="mt-4 inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
        >
          Télécharger le mode d&apos;emploi (PDF)
        </a>
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">
          Notifications email par profil
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Vue consolidée des contacts ayant un accès à l&apos;espace client, tous clients
          confondus. Bascule identique à celle de chaque fiche client — désactivée par défaut
          pour un nouveau contact, pour éviter de spammer quelqu&apos;un qui n&apos;a pas besoin
          d&apos;être notifié.
        </p>

        {clients.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Aucun accès à l&apos;espace client ouvert pour l&apos;instant.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {clients.map((client) => (
              <div key={client.id}>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="text-sm font-medium text-ink transition-colors hover:text-accent"
                >
                  {client.name}
                </Link>
                <div className="mt-2 divide-y divide-line rounded-2xl border border-line">
                  {client.users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          {user.name}
                          {user.role && <span className="text-ink-muted"> · {user.role}</span>}
                        </p>
                        <p className="text-xs text-ink-muted">{user.email}</p>
                      </div>
                      <ClientUserEmailToggle
                        clientUserId={user.id}
                        clientId={client.id}
                        enabled={user.emailNotificationsEnabled}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">Comptes admin</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Accès complet, identique pour chaque compte — pas de permissions par module. Un admin ne
          peut pas révoquer son propre accès.
        </p>
        <div className="mt-4">
          <AdminAccountsPanel admins={admins} currentAdminId={admin.id} />
        </div>
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-medium tracking-tight text-ink">
          <ShieldWarning size={18} weight="regular" />
          Sécurité
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Tentatives de connexion échouées (admin et espace client confondus), 7 derniers jours.
        </p>

        {recentFailedAttempts.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Aucune tentative échouée récente.</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-ink">
              <span className="font-medium text-danger">{recentFailedAttempts.length}</span>{" "}
              tentative{recentFailedAttempts.length > 1 ? "s" : ""} échouée
              {recentFailedAttempts.length > 1 ? "s" : ""}
              {adminFailedCount > 0 && (
                <>
                  {" "}
                  dont{" "}
                  <span className="font-medium text-danger">
                    {adminFailedCount} sur le compte admin
                  </span>
                </>
              )}
              .
            </p>
            <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {recentFailedAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                >
                  <span className="text-ink">{attempt.identifier}</span>
                  <span className="text-xs text-ink-muted">
                    {SECURITY_DATE_FORMATTER.format(attempt.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
