import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { getAppSettings } from "@/lib/settings";

// Purge définitive des livrables finaux (tâches "Terminé") plus vieux que
// `AppSettings.deliverableRetentionDays`. Les BAT en attente de validation
// (Deliverable.kind = "bat") ne sont jamais concernés — seuls les fichiers
// déjà remis au client le sont. Appelé par /api/cron/purge-deliverables
// (planifié) et par le bouton "Purger maintenant" de /admin/reglages
// (déclenchement manuel).
export async function purgeExpiredDeliverables() {
  const settings = await getAppSettings();
  const cutoff = new Date(Date.now() - settings.deliverableRetentionDays * 24 * 60 * 60 * 1000);

  const expired = await db.deliverable.findMany({
    where: {
      uploadedAt: { lt: cutoff },
      task: { status: { slug: TASK_STATUS.TERMINE } },
    },
  });

  const storage = getStorageAdapter();
  for (const deliverable of expired) {
    await storage.delete(deliverable.storageKey).catch(() => {});
    await db.deliverable.delete({ where: { id: deliverable.id } });
  }

  if (expired.length > 0) {
    revalidatePath("/espace-client/livrables");
  }

  return { purgedCount: expired.length, retentionDays: settings.deliverableRetentionDays };
}
