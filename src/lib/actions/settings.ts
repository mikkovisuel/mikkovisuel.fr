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

  const afterEventRaw = formData.get("deliverableRetentionAfterEventDays");
  const deliverableRetentionAfterEventDays =
    typeof afterEventRaw === "string" ? Number.parseInt(afterEventRaw, 10) : NaN;
  if (!Number.isInteger(deliverableRetentionAfterEventDays) || deliverableRetentionAfterEventDays < 1) {
    return { error: "Le délai de purge après l'évènement doit être un entier positif." };
  }

  const noDateRaw = formData.get("deliverableRetentionNoDateDays");
  const deliverableRetentionNoDateDays =
    typeof noDateRaw === "string" ? Number.parseInt(noDateRaw, 10) : NaN;
  if (!Number.isInteger(deliverableRetentionNoDateDays) || deliverableRetentionNoDateDays < 1) {
    return { error: "Le délai de purge sans date d'évènement doit être un entier positif." };
  }

  const popupMessageRaw = formData.get("popupMessage");
  const popupMessage =
    typeof popupMessageRaw === "string" && popupMessageRaw.trim().length > 0
      ? popupMessageRaw.trim()
      : null;

  const reminderDaysRaw = formData.get("prospectReminderDefaultDays");
  const prospectReminderDefaultDays =
    typeof reminderDaysRaw === "string" ? Number.parseInt(reminderDaysRaw, 10) : NaN;
  if (!Number.isInteger(prospectReminderDefaultDays) || prospectReminderDefaultDays < 1) {
    return { error: "Le délai de relance prospection doit être un entier positif." };
  }

  // Emails de facturation (2026-09-07) : champ vide = pas de personnalisation,
  // repli sur le texte fixe par défaut (voir src/lib/invoice-email-templates.ts)
  // — même coercition vide-vers-null que `popupMessage` ci-dessus.
  const blankToNull = (value: FormDataEntryValue | null) =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  const documentSentEmailSubject = blankToNull(formData.get("documentSentEmailSubject"));
  const documentSentEmailBody = blankToNull(formData.get("documentSentEmailBody"));
  const paymentReminderEmailSubject = blankToNull(formData.get("paymentReminderEmailSubject"));
  const paymentReminderEmailBody = blankToNull(formData.get("paymentReminderEmailBody"));
  const invoiceEmailCc = blankToNull(formData.get("invoiceEmailCc"));

  const data = {
    deliverableRetentionAfterEventDays,
    deliverableRetentionNoDateDays,
    batWatermarkEnabled: formData.get("batWatermarkEnabled") === "on",
    popupEnabled: formData.get("popupEnabled") === "on",
    popupMessage,
    prospectReminderDefaultDays,
    documentSentEmailSubject,
    documentSentEmailBody,
    paymentReminderEmailSubject,
    paymentReminderEmailBody,
    invoiceEmailCc,
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
