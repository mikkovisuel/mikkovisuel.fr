import type { Metadata } from "next";
import { verifyClientSession } from "@/lib/dal";
import { ChangePasswordForm } from "@/components/client/change-password-form";
import { EmailNotificationsToggle } from "@/components/client/email-notifications-toggle";

export const metadata: Metadata = {
  title: "Mon compte — Espace client Mikko Visuel",
};

export default async function ClientAccountPage() {
  const clientUser = await verifyClientSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Mon compte</h1>
      <p className="mt-2 text-sm text-ink-muted">Modifiez votre mot de passe de connexion.</p>

      <div className="mt-8">
        {clientUser.client.isDemo ? (
          <p className="text-sm text-ink-muted">
            La gestion du compte est désactivée dans l&apos;espace de démonstration.
          </p>
        ) : (
          <ChangePasswordForm />
        )}
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <h2 className="text-sm font-medium text-ink-muted">Notifications par email</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Recevez un email pour les évènements clés de vos tâches (nouveau BAT à valider, rappel
          d&apos;échéance, nouveau livrable ou document, confirmation de validation).
        </p>
        <div className="mt-4">
          {clientUser.client.isDemo ? (
            <p className="text-sm text-ink-muted">
              Désactivé dans l&apos;espace de démonstration.
            </p>
          ) : (
            <EmailNotificationsToggle enabled={clientUser.emailNotificationsEnabled} />
          )}
        </div>
      </div>
    </div>
  );
}
