"use server";

import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isDensity, isThemeChoice, parseAdminPreferences } from "@/lib/admin-preferences";
import { setThemeCookie } from "@/lib/actions/theme";

// Enregistrement du profil d'affichage — toujours celui de l'admin connecté,
// jamais un autre : l'identifiant vient de la session, pas du formulaire.

function currentObject(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** Densité des listes (roue crantée). Les autres réglages sont conservés. */
export async function setAdminDensity(density: string): Promise<{ error?: string }> {
  const admin = await verifyAdminSession();
  if (!isDensity(density)) return { error: "Densité inconnue." };
  await db.admin.update({
    where: { id: admin.id },
    data: { preferences: { ...currentObject(admin.preferences), density } },
  });
  revalidatePath("/admin", "layout");
  return {};
}

/** Écran « Mon affichage » : tout le profil d'un coup, plus le thème. Le
 * profil reçu est repassé dans `parseAdminPreferences` : seules les valeurs
 * connues sont gardées, le reste retombe sur le défaut. */
export async function saveAdminPreferences(input: {
  preferences: unknown;
  theme: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const admin = await verifyAdminSession();
  if (!isThemeChoice(input.theme)) return { error: "Thème inconnu." };
  // Garde-fou de taille : un profil légitime fait quelques kilo-octets.
  if (JSON.stringify(input.preferences ?? null).length > 20_000) return { error: "Réglages trop volumineux." };

  const preferences = parseAdminPreferences(input.preferences);
  await db.admin.update({
    where: { id: admin.id },
    data: { preferences: JSON.parse(JSON.stringify(preferences)), themePreference: input.theme },
  });
  await setThemeCookie(input.theme);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** « Rétablir les réglages par défaut ». Le thème suit l'appareil. */
export async function resetAdminPreferences(): Promise<{ ok: boolean }> {
  const admin = await verifyAdminSession();
  await db.admin.update({ where: { id: admin.id }, data: { preferences: {}, themePreference: "system" } });
  await setThemeCookie("system");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
