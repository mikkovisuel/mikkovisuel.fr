import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { getAppSettings } from "@/lib/settings";

// Purge définitive des livrables finaux (tâches "Terminé" uniquement — les
// BAT, Deliverable.kind = "bat", et les tâches non terminées ne sont jamais
// concernés, quel que soit le délai). Refonte du 2026-08-16 : la règle
// n'est plus "N jours après l'upload" pour tout le monde, mais basée sur la
// date de l'évènement de la tâche, plus pertinente pour un client qui doit
// garder ses livrables jusqu'à son évènement :
//   - `Task.eventDate` renseignée → purge `deliverableRetentionAfterEventDays`
//     jours après cette date (défaut 7) ;
//   - pas de date d'évènement → purge `deliverableRetentionNoDateDays` jours
//     après l'upload du livrable (défaut 30), faute d'autre repère.
// Appelé par /api/cron/purge-deliverables (planifié) et par le bouton
// "Purger maintenant" de /admin/reglages (déclenchement manuel).
export async function purgeExpiredDeliverables() {
  const settings = await getAppSettings();
  const now = Date.now();
  const eventCutoff = new Date(
    now - settings.deliverableRetentionAfterEventDays * 24 * 60 * 60 * 1000,
  );
  const noDateCutoff = new Date(now - settings.deliverableRetentionNoDateDays * 24 * 60 * 60 * 1000);

  const expired = await db.deliverable.findMany({
    where: {
      kind: "final",
      task: { status: { slug: TASK_STATUS.TERMINE } },
      OR: [
        { task: { eventDate: { not: null, lt: eventCutoff } } },
        { task: { eventDate: null }, uploadedAt: { lt: noDateCutoff } },
      ],
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

  return {
    purgedCount: expired.length,
    deliverableRetentionAfterEventDays: settings.deliverableRetentionAfterEventDays,
    deliverableRetentionNoDateDays: settings.deliverableRetentionNoDateDays,
  };
}
