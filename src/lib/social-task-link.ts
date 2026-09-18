import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { TASK_STATUS, TASK_STATUS_LIST_KEY, TASK_TYPE_LIST_KEY } from "@/lib/dropdown-lists";

// Lien publication réseaux ↔ tâche, dans les deux sens :
// - "Flyer terminé → publication" (livraison 2) : publication créée depuis
//   les livrables finaux d'une tâche existante ;
// - "Demander une création" (2026-09-18) : tâche **interne** créée depuis la
//   publication, dont les livrables finaux rejoignent automatiquement les
//   visuels quand elle passe "Terminé" (choix du client).
// Les deux posent `SocialPost.sourceTaskId` ; `taskMediaImportedAt` garantit
// qu'une tâche ne recopie jamais deux fois ses fichiers dans la même
// publication (retour en arrière puis "Terminé" à nouveau, par exemple).

export const SOCIAL_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "video/mp4"]);

// La limite d'un carrousel Instagram la plus répandue. Au-delà, l'admin
// ajoute le reste à la main.
export const MAX_SOCIAL_MEDIA_FROM_TASK = 10;

/**
 * Copie (jamais une simple référence : les livrables finaux sont purgés
 * après l'évènement) les livrables finaux image/MP4 d'une tâche à la suite
 * des visuels d'une publication, sans dépasser 10 visuels au total. Un
 * fichier à la fois (conteneur de 512 Mo). Un fichier illisible est sauté,
 * pas bloquant. Renvoie le nombre de visuels ajoutés.
 */
export async function copyTaskDeliverablesToPost(taskId: string, postId: string): Promise<number> {
  const [deliverables, existing] = await Promise.all([
    db.deliverable.findMany({ where: { taskId, kind: "final" }, orderBy: { uploadedAt: "asc" } }),
    db.socialPostMedia.aggregate({ where: { postId }, _count: true, _max: { sortOrder: true } }),
  ]);
  const room = Math.max(0, MAX_SOCIAL_MEDIA_FROM_TASK - existing._count);
  const usable = deliverables.filter((item) => SOCIAL_MEDIA_TYPES.has(item.mimeType)).slice(0, room);

  const storage = getStorageAdapter();
  let sortOrder = (existing._max.sortOrder ?? -1) + 1;
  let copied = 0;
  for (const deliverable of usable) {
    try {
      const buffer = await storage.read(deliverable.storageKey);
      const storageKey = `social-posts/${randomUUID()}`;
      await storage.save(storageKey, buffer);
      await db.socialPostMedia.create({
        data: {
          postId,
          fileName: deliverable.fileName,
          storageKey,
          mimeType: deliverable.mimeType,
          sizeBytes: deliverable.sizeBytes,
          storageBackend: storage.backend,
          sortOrder: sortOrder++,
        },
      });
      copied++;
    } catch (error) {
      console.error("copyTaskDeliverablesToPost: copie impossible", deliverable.id, error);
    }
  }
  return copied;
}

/**
 * Appelée quand une tâche passe "Terminé" (`setTaskStatus`) : ajoute ses
 * livrables finaux aux publications qui l'ont demandée et ne les ont pas
 * encore reçus. Renvoie les publications mises à jour (pour revalider).
 */
export async function importTaskDeliverablesIntoLinkedPosts(taskId: string): Promise<string[]> {
  const posts = await db.socialPost.findMany({
    where: { sourceTaskId: taskId, taskMediaImportedAt: null },
    select: { id: true },
  });
  for (const post of posts) {
    await copyTaskDeliverablesToPost(taskId, post.id);
    await db.socialPost.update({ where: { id: post.id }, data: { taskMediaImportedAt: new Date() } });
  }
  return posts.map((post) => post.id);
}

/** Échéance proposée : 3 jours avant la publication (date "AAAA-MM-JJ"). */
export const TASK_LEAD_DAYS = 3;

/**
 * Crée la tâche interne d'une publication et la relie. Même forme qu'une
 * tâche créée par l'admin (statut "Nouveau" + historique), mais `internal` :
 * jamais visible ni notifiée côté client.
 */
export async function createInternalTaskForPost(input: {
  postId: string;
  clientId: string;
  adminId: string;
  title: string;
  typeSlug: string;
  dueDate: Date | null;
  description: string | null;
}): Promise<{ taskId: string } | { error: string }> {
  const [statusList, type] = await Promise.all([
    db.dropdownList.findUniqueOrThrow({ where: { key: TASK_STATUS_LIST_KEY } }),
    db.dropdownItem.findFirst({ where: { slug: input.typeSlug, list: { key: TASK_TYPE_LIST_KEY } } }),
  ]);
  if (!type) return { error: "Type de création inconnu." };
  const status = await db.dropdownItem.findUniqueOrThrow({
    where: { listId_slug: { listId: statusList.id, slug: TASK_STATUS.NOUVEAU } },
  });

  const task = await db.task.create({
    data: {
      clientId: input.clientId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      statusId: status.id,
      types: { connect: [{ id: type.id }] },
      createdByType: "ADMIN",
      createdById: input.adminId,
      internal: true,
    },
  });
  await db.taskStatusHistory.create({
    data: {
      taskId: task.id,
      statusSlug: status.slug,
      statusLabel: status.label,
      changedByType: "ADMIN",
      changedById: input.adminId,
      changedByName: "Mikko",
    },
  });
  await db.socialPost.update({
    where: { id: input.postId },
    data: { sourceTaskId: task.id, taskMediaImportedAt: null },
  });
  return { taskId: task.id };
}
