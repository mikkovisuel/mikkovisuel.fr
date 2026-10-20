"use server";

import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { isDensity } from "@/lib/admin-preferences";

/** Densité des listes de l'admin connecté (et de lui seul). */
export async function setAdminDensity(density: string): Promise<{ error?: string }> {
  const admin = await verifyAdminSession();
  if (!isDensity(density)) return { error: "Densité inconnue." };

  // Fusion : les autres réglages du profil (à venir) sont conservés.
  const current =
    admin.preferences && typeof admin.preferences === "object" && !Array.isArray(admin.preferences)
      ? (admin.preferences as Record<string, unknown>)
      : {};
  await db.admin.update({
    where: { id: admin.id },
    data: { preferences: { ...current, density } },
  });
  revalidatePath("/admin", "layout");
  return {};
}
