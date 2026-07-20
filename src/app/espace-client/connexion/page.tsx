import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { clientLogin } from "@/lib/actions/client-auth";
import { viewDemoClientSpace } from "@/lib/actions/demo";

export const metadata: Metadata = {
  title: "Connexion — Espace client Mikko Visuel",
};

export default function ClientLoginPage() {
  return (
    <AuthShell title="Espace client" subtitle="Connectez-vous pour suivre vos demandes.">
      <LoginForm action={clientLogin} forgotPasswordHref="/espace-client/mot-de-passe-oublie" />
      <div className="mt-6 border-t border-line pt-6 text-center">
        <p className="text-sm text-ink-muted">Pas encore client ?</p>
        <form action={viewDemoClientSpace} className="mt-2">
          <button
            type="submit"
            className="text-sm font-medium text-ink underline underline-offset-2 transition-colors hover:text-accent"
          >
            Voir l&apos;espace client de démo
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
