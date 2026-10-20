import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { PageToolbar } from "@/components/admin/page-toolbar";
import { MonAffichageForm } from "@/components/admin/mon-affichage-form";
import { isThemeChoice, parseAdminPreferences } from "@/lib/admin-preferences";

export const metadata: Metadata = {
  title: "Mon affichage — Admin Mikko Visuel",
};

// Personnalisation du back-office par profil admin (demande du 2026-10-20,
// maquette validée : « tout ok, code tout »). Toujours le profil de l'admin
// connecté : aucun identifiant dans l'URL.
export default async function MonAffichagePage() {
  const admin = await verifyAdminSession();
  return (
    <>
      <PageToolbar title="Mon affichage" />
      <MonAffichageForm
        initialPreferences={parseAdminPreferences(admin.preferences)}
        initialTheme={isThemeChoice(admin.themePreference) ? admin.themePreference : "light"}
        email={admin.email}
      />
    </>
  );
}
