import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RequestResetForm } from "@/components/auth/request-reset-form";
import { requestAdminPasswordReset } from "@/lib/actions/password-reset";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Admin Mikko Visuel",
};

export default function AdminForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Recevez un lien de réinitialisation par email."
    >
      <RequestResetForm action={requestAdminPasswordReset} />
    </AuthShell>
  );
}
