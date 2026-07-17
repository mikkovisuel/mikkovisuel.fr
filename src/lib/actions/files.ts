"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { getStorageAdapter } from "@/lib/storage";
import { sendEmail } from "@/lib/email/service";

const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
const MAX_DELIVERABLE_SIZE = 500 * 1024 * 1024;

const ALLOWED_DELIVERABLE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "video/mp4",
]);
const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf"]);

export type FileUploadState = { error?: string } | undefined;

export async function uploadDeliverable(
  taskId: string,
  _prev: FileUploadState,
  formData: FormData,
): Promise<FileUploadState> {
  await verifyAdminSession();

  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Choisissez au moins un fichier." };
  }
  for (const file of files) {
    if (file.size > MAX_DELIVERABLE_SIZE) {
      return { error: `"${file.name}" est trop volumineux (500 Mo maximum).` };
    }
    if (!ALLOWED_DELIVERABLE_TYPES.has(file.type)) {
      return { error: `"${file.name}" : type de fichier non autorisé.` };
    }
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { client: { include: { users: true } } },
  });
  if (!task) return { error: "Tâche introuvable." };

  const storage = getStorageAdapter();
  for (const file of files) {
    const storageKey = `deliverables/${randomUUID()}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await storage.save(storageKey, buffer);

    await db.deliverable.create({
      data: {
        taskId,
        fileName: file.name,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        storageBackend: storage.backend,
      },
    });
  }

  for (const user of task.client.users) {
    await sendEmail({
      trigger: "new_deliverable",
      to: user.email,
      subject: `Nouveau livrable disponible — ${task.title}`,
      html: `<p>${
        files.length > 1
          ? `${files.length} nouveaux fichiers sont disponibles`
          : "Un nouveau fichier est disponible"
      } dans l'onglet Livrables pour "${task.title}".</p>`,
    });
  }

  revalidatePath(`/admin/clients/${task.clientId}`);
  revalidatePath(`/admin/taches/${taskId}`);
  revalidatePath("/espace-client/livrables");
  return undefined;
}

export async function deleteDeliverable(deliverableId: string) {
  await verifyAdminSession();

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    include: { task: true },
  });
  if (!deliverable) return;

  await getStorageAdapter().delete(deliverable.storageKey);
  await db.deliverable.delete({ where: { id: deliverableId } });

  revalidatePath(`/admin/clients/${deliverable.task.clientId}`);
  revalidatePath(`/admin/taches/${deliverable.taskId}`);
  revalidatePath("/espace-client/livrables");
}

// Miroir de `deleteDeliverable` — admin uniquement, le client ne supprime
// pas les fichiers de référence qu'il a lui-même déposés.
export async function deleteAttachment(attachmentId: string) {
  await verifyAdminSession();

  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: true },
  });
  if (!attachment) return;

  await getStorageAdapter().delete(attachment.storageKey);
  await db.attachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/admin/taches/${attachment.taskId}`);
}

export async function uploadDocument(
  _prev: FileUploadState,
  formData: FormData,
): Promise<FileUploadState> {
  const admin = await verifyAdminSession();

  const file = formData.get("file");
  const typeId = formData.get("typeId");
  const amountRaw = formData.get("amountEuros");
  const clientId = formData.get("clientId");
  const dueDateRaw = formData.get("dueDate");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier." };
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return { error: "Fichier trop volumineux (20 Mo maximum)." };
  }
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return { error: "Seuls les fichiers PDF sont acceptés." };
  }
  if (typeof typeId !== "string" || !typeId) {
    return { error: "Choisissez un type de document." };
  }
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Choisissez un client." };
  }

  const docType = await db.dropdownItem.findUnique({ where: { id: typeId } });
  if (!docType) return { error: "Type de document invalide." };

  let amountCents: number | null = null;
  if (typeof amountRaw === "string" && amountRaw.trim() !== "") {
    const parsedAmount = Number(amountRaw.replace(",", "."));
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      return { error: "Montant invalide." };
    }
    amountCents = Math.round(parsedAmount * 100);
  }

  const client = await db.client.findUnique({
    where: { id: clientId },
    include: { users: true },
  });
  if (!client) return { error: "Client introuvable." };

  const storage = getStorageAdapter();
  const storageKey = `documents/${randomUUID()}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.save(storageKey, buffer);

  await db.document.create({
    data: {
      clientId,
      typeId,
      fileName: file.name,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      storageBackend: storage.backend,
      amountCents,
      paymentStatus: amountCents !== null ? "unpaid" : "n/a",
      dueDate: typeof dueDateRaw === "string" && dueDateRaw ? new Date(dueDateRaw) : null,
      uploadedByAdminId: admin.id,
    },
  });

  for (const user of client.users) {
    await sendEmail({
      trigger: "new_document",
      to: user.email,
      subject: `Nouveau document disponible — ${docType.label}`,
      html: `<p>Un nouveau document (${docType.label}) est disponible dans votre espace client, onglet Administratif.</p>`,
    });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/documents");
  revalidatePath("/espace-client");
  revalidatePath("/espace-client/administratif");
  return undefined;
}
