"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { SETTINGS_ID } from "@/lib/settings";
import { purgeExpiredDeliverables } from "@/lib/deliverable-purge";

export type SettingsFormState = { error?: string; success?: boolean } | undefined;
export type PurgeState = { message?: string } | undefined;

export async function updateSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await verifyAdminSession();

  const retentionRaw = formData.get("deliverableRetentionDays");
  const retentionDays = typeof retentionRaw === "string" ? Number.parseInt(retentionRaw, 10) : NaN;
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    return { error: "Le nombre de jours de rétention doit être un entier positif." };
  }

  const popupMessageRaw = formData.get("popupMessage");
  const popupMessage =
    typeof popupMessageRaw === "string" && popupMessageRaw.trim().length > 0
      ? popupMessageRaw.trim()
      : null;

  const data = {
    deliverableRetentionDays: retentionDays,
    batWatermarkEnabled: formData.get("batWatermarkEnabled") === "on",
    popupEnabled: formData.get("popupEnabled") === "on",
    popupMessage,
  };

  await db.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  revalidatePath("/admin/reglages");
  revalidatePath("/espace-client", "layout");
  return { success: true };
}

export async function purgeDeliverablesNow(): Promise<PurgeState> {
  await verifyAdminSession();

  const { purgedCount } = await purgeExpiredDeliverables();
  revalidatePath("/admin/reglages");
  revalidatePath("/espace-client/livrables");
  return {
    message:
      purgedCount === 0
        ? "Aucun livrable à purger pour le moment."
        : `${purgedCount} livrable${purgedCount > 1 ? "s" : ""} purgé${purgedCount > 1 ? "s" : ""}.`,
  };
}
