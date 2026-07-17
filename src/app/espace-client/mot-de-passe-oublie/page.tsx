import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RequestResetForm } from "@/components/auth/request-reset-form";
import { requestClientPasswordReset } from "@/lib/actions/password-reset";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Espace client Mikko Visuel",
};

export default function ClientForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Recevez un lien de réinitialisation par email."
    >
      <RequestResetForm action={requestClientPasswordReset} />
    </AuthShell>
  );
}
