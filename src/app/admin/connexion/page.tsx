import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { adminLogin } from "@/lib/actions/admin-auth";

export const metadata: Metadata = {
  title: "Connexion admin — Mikko Visuel",
};

export default function AdminLoginPage() {
  return (
    <AuthShell title="Espace admin" subtitle="Réservé à Mikko.">
      <LoginForm action={adminLogin} forgotPasswordHref="/admin/mot-de-passe-oublie" />
    </AuthShell>
  );
}
