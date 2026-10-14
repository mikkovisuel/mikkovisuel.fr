import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { resetPassword } from "@/lib/actions/password-reset";
import { UnusableResetLink } from "@/components/auth/unusable-reset-link";
import { getResetLinkStatus } from "@/lib/password-reset-token";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe — Admin Mikko Visuel",
};

export default async function AdminResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const action = resetPassword.bind(null, token);
  // Le lien est vérifié dès l'ouverture : expiré ou déjà utilisé, on le dit
  // tout de suite et on propose une issue, au lieu du formulaire.
  const status = await getResetLinkStatus(token);

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un mot de passe pour votre compte admin.">
      {status === "valid" ? (
        <ResetPasswordForm action={action} />
      ) : (
        <UnusableResetLink status={status} space="admin" />
      )}
    </AuthShell>
  );
}
