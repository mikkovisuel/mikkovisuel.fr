"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { getStorageAdapter } from "@/lib/storage";
import { sendEmail } from "@/lib/email/service";
import { formatFileSize } from "@/lib/files";
import { taskDateFormatterShort } from "@/lib/tasks";

const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
const MAX_DELIVERABLE_SIZE = 500 * 1024 * 1024;
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
// Marge de sécurité sous la limite réelle de Resend (~40 Mo par email, tout
// compris) : l'encodage base64 des pièces jointes gonfle leur taille
// d'environ un tiers, donc on plafonne bien en-dessous plutôt qu'au ras de
// la limite du fournisseur.
const MAX_EMAIL_ATTACHMENTS_SIZE = 25 * 1024 * 1024;

const ALLOWED_DELIVERABLE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "video/mp4",
]);
const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf"]);
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

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

  const kindRaw = formData.get("kind");
  const kind = kindRaw === "bat" ? "bat" : "final";

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { client: { include: { users: true } } },
  });
  if (!task) return { error: "Tâche introuvable." };

  const storage = getStorageAdapter();
  // En parallèle plutôt que fichier par fichier : avec plusieurs livrables
  // en un envoi, un upload séquentiel vers le stockage S3 peut prendre assez
  // de temps pour dépasser le délai d'attente du routeur.
  // Attrapé explicitement : sans ce try/catch, un échec de stockage (S3 hors
  // service, mémoire serveur saturée par un gros fichier vidéo, etc.) remonte
  // comme une exception non gérée et fait planter toute la page côté admin
  // (écran blanc) au lieu d'un message d'erreur clair dans le formulaire.
  try {
    await Promise.all(
      files.map(async (file) => {
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
            kind,
          },
        });
      }),
    );
  } catch (error) {
    console.error("uploadDeliverable failed", error);
    return {
      error:
        "L'envoi a échoué (fichier trop lourd pour la mémoire du serveur, ou problème de stockage). Réessayez avec moins de fichiers à la fois, ou un par un.",
    };
  }

  const tabLabel = kind === "bat" ? "À valider" : "Livrables";
  for (const user of task.client.users) {
    if (!user.emailNotificationsEnabled) continue;
    await sendEmail({
      trigger: "new_deliverable",
      to: user.email,
      subject:
        kind === "bat"
          ? `Nouveau BAT à valider — ${task.title}`
          : `Nouveau livrable disponible — ${task.title}`,
      html: `<p>${
        files.length > 1
          ? `${files.length} nouveaux fichiers sont disponibles`
          : "Un nouveau fichier est disponible"
      } dans l'onglet ${tabLabel} pour "${task.title}".</p>`,
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

export type SendDeliverablesFormState = { error?: string; success?: boolean } | undefined;

// Envoi groupé des livrables finaux d'une tâche à l'email de facturation du
// client (même mécanique que `sendDocumentByEmail`), en pièces jointes.
// Objet = "date de l'évènement - titre de la tâche" (ou juste le titre si la
// tâche n'a pas de date). Les BAT (kind "bat") ne sont jamais inclus : ce
// bouton concerne uniquement le travail livré, pas les épreuves à valider.
export async function sendDeliverablesByEmail(
  taskId: string,
  _prev: SendDeliverablesFormState,
  _formData: FormData,
): Promise<SendDeliverablesFormState> {
  await verifyAdminSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { client: true, deliverables: true },
  });
  if (!task) return { error: "Tâche introuvable." };
  if (!task.client.billingEmail) {
    return { error: "Ajoutez un email de facturation sur la fiche client." };
  }

  const finalDeliverables = task.deliverables.filter((d) => d.kind === "final");
  if (finalDeliverables.length === 0) {
    return { error: "Aucun livrable final à envoyer." };
  }

  const totalSize = finalDeliverables.reduce((sum, d) => sum + d.sizeBytes, 0);
  if (totalSize > MAX_EMAIL_ATTACHMENTS_SIZE) {
    return {
      error: `Livrables trop volumineux pour un envoi par email (${formatFileSize(totalSize)}, ${formatFileSize(MAX_EMAIL_ATTACHMENTS_SIZE)} max) — le client peut les télécharger depuis son espace client.`,
    };
  }

  const storage = getStorageAdapter();
  const attachments = await Promise.all(
    finalDeliverables.map(async (deliverable) => ({
      filename: deliverable.fileName,
      content: await storage.read(deliverable.storageKey),
    })),
  );

  const subject = task.eventDate
    ? `${taskDateFormatterShort.format(task.eventDate)} - ${task.title}`
    : task.title;

  await sendEmail({
    trigger: "deliverables_sent",
    to: task.client.billingEmail,
    subject,
    html: `<p>Bonjour,</p><p>Vous trouverez ci-joint les livrables finaux de la tâche "${task.title}".</p><p>Je reste à disposition pour tout renseignement complémentaire.</p><p>Par avance, merci.</p>`,
    attachments,
  });

  await db.task.update({ where: { id: taskId }, data: { deliverablesSentAt: new Date() } });

  revalidatePath(`/admin/taches/${taskId}`);
  revalidatePath(`/admin/clients/${task.clientId}`);
  return { success: true };
}

// Miroir de `uploadDeliverable`, mais pour les pièces jointes de référence
// (moodboard, logo...) — jusqu'ici uniquement déposables par le client à la
// création d'une tâche ; l'admin peut désormais aussi en ajouter après coup.
export async function uploadAttachment(
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
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return { error: `"${file.name}" est trop volumineux (20 Mo maximum).` };
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return { error: `"${file.name}" : type de fichier non autorisé.` };
    }
  }

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Tâche introuvable." };

  const storage = getStorageAdapter();
  // En parallèle plutôt que fichier par fichier — voir uploadDeliverable.
  try {
    await Promise.all(
      files.map(async (file) => {
        const storageKey = `attachments/${randomUUID()}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await storage.save(storageKey, buffer);

        await db.attachment.create({
          data: {
            taskId,
            fileName: file.name,
            storageKey,
            mimeType: file.type,
            sizeBytes: file.size,
            storageBackend: storage.backend,
          },
        });
      }),
    );
  } catch (error) {
    console.error("uploadAttachment failed", error);
    return {
      error: "L'envoi a échoué. Réessayez avec moins de fichiers à la fois, ou un par un.",
    };
  }

  revalidatePath(`/admin/taches/${taskId}`);
  return undefined;
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
    if (!user.emailNotificationsEnabled) continue;
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

// Miroir de `deleteDeliverable`/`deleteAttachment` : efface aussi le fichier
// du stockage, pas seulement la ligne en base.
export async function deleteDocument(documentId: string) {
  await verifyAdminSession();

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) return;

  await getStorageAdapter().delete(document.storageKey);
  await db.document.delete({ where: { id: documentId } });

  revalidatePath(`/admin/clients/${document.clientId}`);
  revalidatePath("/admin/documents");
  revalidatePath("/espace-client");
  revalidatePath("/espace-client/administratif");
}
