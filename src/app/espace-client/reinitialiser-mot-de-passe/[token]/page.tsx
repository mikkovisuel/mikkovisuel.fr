import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { resetPassword } from "@/lib/actions/password-reset";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe — Espace client Mikko Visuel",
};

export default async function ClientResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const action = resetPassword.bind(null, token);

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe pour votre compte.">
      <ResetPasswordForm action={action} />
    </AuthShell>
  );
}
