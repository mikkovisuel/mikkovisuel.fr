import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { clientLogin } from "@/lib/actions/client-auth";

export const metadata: Metadata = {
  title: "Connexion — Espace client Mikko Visuel",
};

export default function ClientLoginPage() {
  return (
    <AuthShell title="Espace client" subtitle="Connectez-vous pour suivre vos demandes.">
      <LoginForm action={clientLogin} forgotPasswordHref="/espace-client/mot-de-passe-oublie" />
    </AuthShell>
  );
}
