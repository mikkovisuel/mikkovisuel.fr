import type { Metadata } from "next";
import Link from "next/link";
import {
  WarningCircle,
  CheckCircle,
  ShieldWarning,
  ListBullets,
  DownloadSimple,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { SettingsForm } from "@/components/admin/settings-form";
import { GmailConnectionCard } from "@/components/admin/gmail-connection-card";
import { ClientUserEmailToggle } from "@/components/admin/client-user-email-toggle";
import { AdminAccountsPanel } from "@/components/admin/admin-accounts-panel";
import { CollapsibleSection } from "@/components/admin/collapsible-section";

export const metadata: Metadata = {
  title: "Réglages — Admin Mikko Visuel",
};

const SECURITY_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// Les trois écrans sortis de la barre de navigation le 2026-07-31. Rappelés
// en tête de page en plus du menu de la roue (voir `SettingsMenu`), pour
// qu'ils restent trouvables par quelqu'un habitué à les voir en onglets.
const SETTINGS_SHORTCUTS = [
  {
    href: "/admin/listes",
    label: "Listes déroulantes",
    hint: "Statuts, types, catégories",
    icon: ListBullets,
  },
  {
    href: "/admin/exports",
    label: "Exports",
    hint: "Sauvegardes et extractions",
    icon: DownloadSimple,
  },
  {
    href: "/admin/audit",
    label: "Audit",
    hint: "Journal des actions sensibles",
    icon: ShieldCheck,
  },
];

// Enveloppe commune des sections de réglages : elles étaient auparavant
// séparées par de simples filets horizontaux, ce qui se lit mal dès qu'on
// passe sur deux colonnes — une carte délimite sans ambiguïté où commence
// et finit chaque section.
function SettingsCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-medium tracking-tight text-ink">
        {icon}
        {title}
      </h2>
      {description && <p className="mt-2 text-sm text-ink-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

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

  // Tentatives de connexion échouées des 7 derniers jours — la table
  // `LoginAttempt` sert déjà à bloquer le brute-force (voir src/lib/
  // rate-limit.ts), mais rien ne l'affichait jusqu'ici. Utile pour un admin
  // seul détenteur de l'accès à toutes les données clients : un signal
  // simple si quelqu'un tente de deviner le mot de passe.
  const sevenDaysAgo = getSevenDaysAgo();

  // Perf : ces trois requêtes sont indépendantes — lancées en parallèle
  // plutôt qu'enchaînées, elles ne coûtent que le temps de la plus lente
  // des trois au lieu de la somme des trois.
  const [clients, recentFailedAttempts, admins] = await Promise.all([
    db.client.findMany({
      // Seuls les contacts ayant un accès ouvert : les notifications parlent
      // toutes de "votre espace client", proposer de les activer pour un simple
      // contact du carnet d'adresses n'aurait pas de sens.
      where: { ...ACTIVE_CLIENTS, contacts: { some: { portalAccessEnabled: true } } },
      include: {
        contacts: {
          where: { portalAccessEnabled: true },
          orderBy: { createdAt: "asc" },
          include: { contact: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.loginAttempt.findMany({
      where: { succeeded: false, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.admin.findMany({
      select: { id: true, email: true, lastLoginAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const adminFailedCount = recentFailedAttempts.filter(
    (attempt) => attempt.identifier === admin.email.toLowerCase(),
  ).length;

  return (
    // Auparavant une colonne unique en `max-w-2xl` : six sections empilées
    // sur un seul long défilement, dont deux (comptes admin, sécurité)
    // enterrées sous la liste de notifications, potentiellement très longue.
    // Passage en deux colonnes à partir de `lg`, avec les sections en
    // cartes — et les deux colonnes sont composées à la main plutôt qu'en
    // grille automatique, pour maîtriser ce qui tombe où au lieu de le
    // laisser au hasard des hauteurs.
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Réglages</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Paramètres appliqués en direct sur l&apos;ensemble des espaces clients.
      </p>

      {/* Les trois écrans retirés de la barre principale le 2026-07-31 sont
          rappelés ici, et pas seulement dans le menu de la roue : une fois
          sortis de la navigation, ils deviendraient sinon difficiles à
          retrouver pour qui a l'habitude des onglets. */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {SETTINGS_SHORTCUTS.map(({ href, label, hint, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-2xl border border-line p-4 transition-colors hover:border-accent"
          >
            <Icon size={18} weight="regular" className="mt-0.5 shrink-0 text-ink-muted" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{label}</span>
              <span className="block text-xs text-ink-muted">{hint}</span>
            </span>
          </Link>
        ))}
      </div>

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

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SettingsCard title="Paramètres généraux">
            <SettingsForm
              defaultValues={{
                deliverableRetentionAfterEventDays: settings.deliverableRetentionAfterEventDays,
                deliverableRetentionNoDateDays: settings.deliverableRetentionNoDateDays,
                batWatermarkEnabled: settings.batWatermarkEnabled,
                popupEnabled: settings.popupEnabled,
                popupMessage: settings.popupMessage ?? "",
                prospectReminderDefaultDays: settings.prospectReminderDefaultDays,
              }}
            />
          </SettingsCard>

          <SettingsCard title="Boîte mail">
            <GmailConnectionCard
              gmailEmail={admin.gmailEmail}
              gmailConnectedAt={admin.gmailConnectedAt}
            />
          </SettingsCard>

          <SettingsCard
            title="Mode d'emploi client"
            description="Guide PDF illustré expliquant chaque onglet de l'espace client, dans la charte du site — à télécharger et transmettre à vos clients."
          >
            <a
              href="/api/exports/guide"
              className="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
            >
              Télécharger le mode d&apos;emploi (PDF)
            </a>
          </SettingsCard>
        </div>

        <div className="flex flex-col gap-6">
          <SettingsCard
            title="Comptes admin"
            description="Accès complet, identique pour chaque compte — pas de permissions par module. Un admin ne peut pas révoquer son propre accès."
          >
            <AdminAccountsPanel admins={admins} currentAdminId={admin.id} />
          </SettingsCard>

          <SettingsCard
            title="Sécurité"
            icon={<ShieldWarning size={18} weight="regular" />}
            description="Tentatives de connexion échouées (admin et espace client confondus), 7 derniers jours."
          >
            {recentFailedAttempts.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucune tentative échouée récente.</p>
            ) : (
              <>
                <p className="text-sm text-ink">
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
          </SettingsCard>

          {/* Repliée par défaut : c'est la seule section dont la hauteur
              croît avec le nombre de clients, et c'est elle qui enterrait
              les comptes admin et la sécurité dans l'ancienne mise en page. */}
          <SettingsCard
            title="Notifications email par profil"
            description="Vue consolidée des contacts ayant un accès à l'espace client, tous clients confondus. Bascule identique à celle de chaque fiche client — désactivée par défaut pour un nouveau contact, pour éviter de spammer quelqu'un qui n'a pas besoin d'être notifié."
          >
            {clients.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Aucun accès à l&apos;espace client ouvert pour l&apos;instant.
              </p>
            ) : (
              <CollapsibleSection title="Afficher les profils" count={clients.length}>
                <div className="flex flex-col gap-6">
                  {clients.map((client) => (
                    <div key={client.id}>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-sm font-medium text-ink transition-colors hover:text-accent"
                      >
                        {client.name}
                      </Link>
                      <div className="mt-2 divide-y divide-line rounded-2xl border border-line">
                        {client.contacts.map((link) => (
                          <div
                            key={link.id}
                            className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-ink">
                                {link.contact.name}
                                {link.contact.role && (
                                  <span className="text-ink-muted"> · {link.contact.role}</span>
                                )}
                              </p>
                              <p className="text-xs text-ink-muted">{link.contact.email}</p>
                            </div>
                            <ClientUserEmailToggle
                              clientUserId={link.id}
                              clientId={client.id}
                              enabled={link.emailNotificationsEnabled}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
