import "server-only";
import { cache } from "react";
import { verifyAdminSession } from "@/lib/dal";
import { parseAdminPreferences } from "@/lib/admin-preferences";

/** Profil d'affichage de l'admin connecté, lu une fois par requête. */
export const getMyPreferences = cache(async () => {
  const admin = await verifyAdminSession();
  return parseAdminPreferences(admin.preferences);
});
