"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyClientSession, assertNotDemo } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";

// Annotations du client sur les images de BAT (2026-10-22) : un clic sur
// l'image = un point + un commentaire. Seulement sur un BAT image de sa
// propre tâche, tant qu'elle est « À valider ».

const AnnotationSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  body: z.string().trim().min(1, { message: "Écrivez la correction souhaitée." }).max(1000),
});

async function annotatableDeliverable(deliverableId: string, clientId: string) {
  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: { task: { select: { id: true, clientId: true, internal: true, status: { select: { slug: true } } } } },
  });
  if (
    !deliverable ||
    deliverable.kind !== "bat" ||
    !deliverable.mimeType.startsWith("image/") ||
    deliverable.task.clientId !== clientId ||
    deliverable.task.internal ||
    deliverable.task.status.slug !== TASK_STATUS.A_VALIDER
  ) {
    return null;
  }
  return deliverable;
}

function revalidate(taskId: string) {
  revalidatePath(`/espace-client/taches/${taskId}`);
  revalidatePath("/espace-client/a-valider");
  revalidatePath(`/admin/taches/${taskId}`);
}

export async function addBatAnnotation(
  deliverableId: string,
  input: { x: number; y: number; body: string },
): Promise<{ error?: string; id?: string }> {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);
  const parsed = AnnotationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Annotation invalide." };
  const deliverable = await annotatableDeliverable(deliverableId, clientUser.clientId);
  if (!deliverable) return { error: "Ce visuel ne peut plus être annoté." };

  const annotation = await db.deliverableAnnotation.create({
    data: {
      deliverableId,
      ...parsed.data,
      authorType: "CLIENT_USER",
      authorId: clientUser.id,
      authorName: clientUser.name,
    },
  });
  revalidate(deliverable.task.id);
  return { id: annotation.id };
}

export async function deleteBatAnnotation(annotationId: string): Promise<{ error?: string }> {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);
  const annotation = await db.deliverableAnnotation.findUnique({ where: { id: annotationId } });
  if (!annotation || annotation.authorType !== "CLIENT_USER" || annotation.authorId !== clientUser.id) {
    return { error: "Annotation introuvable." };
  }
  const deliverable = await annotatableDeliverable(annotation.deliverableId, clientUser.clientId);
  if (!deliverable) return { error: "Ce visuel ne peut plus être modifié." };
  await db.deliverableAnnotation.delete({ where: { id: annotationId } });
  revalidate(deliverable.task.id);
  return {};
}
