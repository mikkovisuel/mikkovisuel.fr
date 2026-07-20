import type { Metadata } from "next";
import { verifyClientSession } from "@/lib/dal";
import { ChangePasswordForm } from "@/components/client/change-password-form";

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
    </div>
  );
}
