import { db } from "@/lib/db";

const SETTINGS_ID = "settings";

const DEFAULT_SETTINGS = {
  deliverableRetentionAfterEventDays: 7,
  deliverableRetentionNoDateDays: 30,
  batWatermarkEnabled: true,
  popupEnabled: false,
  popupMessage: null as string | null,
  prospectReminderDefaultDays: 14,
};

// Lecture du singleton AppSettings, avec des valeurs par défaut tant que la
// ligne n'a pas encore été créée (premier réglage depuis /admin/reglages) —
// même pattern que resolveHomepageContent (src/lib/homepage-content.ts).
export async function getAppSettings() {
  const row = await db.appSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row ?? { id: SETTINGS_ID, updatedAt: new Date(), ...DEFAULT_SETTINGS };
}

export { SETTINGS_ID };
