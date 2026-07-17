"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyAdminSession, verifyClientSession } from "@/lib/dal";
import { sendEmail } from "@/lib/email/service";
import { getStorageAdapter } from "@/lib/storage";
import { isTaskOverdue } from "@/lib/tasks";

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);
import {
  TASK_FORMAT_LIST_KEY,
  TASK_STATUS,
  TASK_STATUS_LIST_KEY,
  TASK_TYPE_LIST_KEY,
  type TaskStatusSlug,
} from "@/lib/dropdown-lists";
import {
  TaskSchema,
  RefusalSchema,
  type TaskFormState,
  type RefusalFormState,
} from "@/lib/validation/task";

async function getStatusId(slug: TaskStatusSlug) {
  const list = await db.dropdownList.findUniqueOrThrow({ where: { key: TASK_STATUS_LIST_KEY } });
  const item = await db.dropdownItem.findUniqueOrThrow({
    where: { listId_slug: { listId: list.id, slug } },
  });
  return item.id;
}

async function getDropdownItemIds(listKey: string, slugs: string[]) {
  if (slugs.length === 0) return [];
  const list = await db.dropdownList.findUniqueOrThrow({ where: { key: listKey } });
  const items = await db.dropdownItem.findMany({
    where: { listId: list.id, slug: { in: slugs } },
  });
  return items.map((item) => ({ id: item.id }));
}

function revalidateTaskPaths(clientId: string) {
  revalidatePath("/admin/taches");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/espace-client");
  revalidatePath("/espace-client/a-valider");
  revalidatePath("/espace-client/suivi");
  revalidatePath("/espace-client/livrables");
}

export async function createTaskByClient(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const clientUser = await verifyClientSession();

  const parsed = TaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate"),
    types: formData.getAll("types"),
    formats: formData.getAll("formats"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const attachmentFiles = formData
    .getAll("attachments")
    .filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of attachmentFiles) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return { error: `"${file.name}" est trop volumineux (20 Mo maximum).` };
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return { error: `"${file.name}" : type de fichier non autorisé.` };
    }
  }

  const [statusId, typeIds, formatIds] = await Promise.all([
    getStatusId(TASK_STATUS.NOUVEAU),
    getDropdownItemIds(TASK_TYPE_LIST_KEY, parsed.data.types),
    getDropdownItemIds(TASK_FORMAT_LIST_KEY, parsed.data.formats),
  ]);

  const task = await db.task.create({
    data: {
      clientId: clientUser.clientId,
      title: parsed.data.title,
      description: parsed.data.description,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      statusId,
      types: { connect: typeIds },
      formats: { connect: formatIds },
      createdByType: "CLIENT_USER",
      createdById: clientUser.id,
    },
  });

  const storage = getStorageAdapter();
  for (const file of attachmentFiles) {
    const storageKey = `attachments/${randomUUID()}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await storage.save(storageKey, buffer);

    await db.attachment.create({
      data: {
        taskId: task.id,
        fileName: file.name,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        storageBackend: storage.backend,
      },
    });
  }

  revalidateTaskPaths(clientUser.clientId);
  return undefined;
}

async function createTaskRecord(
  clientId: string,
  adminId: string,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = TaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate"),
    types: formData.getAll("types"),
    formats: formData.getAll("formats"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const [statusId, typeIds, formatIds] = await Promise.all([
    getStatusId(TASK_STATUS.NOUVEAU),
    getDropdownItemIds(TASK_TYPE_LIST_KEY, parsed.data.types),
    getDropdownItemIds(TASK_FORMAT_LIST_KEY, parsed.data.formats),
  ]);

  await db.task.create({
    data: {
      clientId,
      title: parsed.data.title,
      description: parsed.data.description,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      statusId,
      types: { connect: typeIds },
      formats: { connect: formatIds },
      createdByType: "ADMIN",
      createdById: adminId,
    },
  });

  revalidateTaskPaths(clientId);
  return undefined;
}

export async function createTaskByAdmin(
  clientId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const admin = await verifyAdminSession();
  return createTaskRecord(clientId, admin.id, formData);
}

// Variante pour `/admin/taches/nouveau`, où le client est choisi dans le
// formulaire plutôt que déjà connu depuis l'URL (fiche client).
export async function createTaskByAdminAnyClient(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const admin = await verifyAdminSession();

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Sélectionnez un client." };
  }

  const result = await createTaskRecord(clientId, admin.id, formData);
  if (result?.error) return result;

  redirect("/admin/taches");
}

export async function updateTask(
  taskId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await verifyAdminSession();

  const parsed = TaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate"),
    types: formData.getAll("types"),
    formats: formData.getAll("formats"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const dueDateRaw = formData.get("dueDate");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Tâche introuvable." };

  const [typeIds, formatIds] = await Promise.all([
    getDropdownItemIds(TASK_TYPE_LIST_KEY, parsed.data.types),
    getDropdownItemIds(TASK_FORMAT_LIST_KEY, parsed.data.formats),
  ]);

  await db.task.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      dueDate: typeof dueDateRaw === "string" && dueDateRaw ? new Date(dueDateRaw) : null,
      types: { set: typeIds },
      formats: { set: formatIds },
    },
  });

  revalidateTaskPaths(task.clientId);
  redirect(`/admin/clients/${task.clientId}`);
}

async function notifyClientUsersOfNewTaskToValidate(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { client: { include: { users: true } } },
  });
  if (!task) return;

  for (const user of task.client.users) {
    await sendEmail({
      trigger: "new_task_to_validate",
      to: user.email,
      subject: `Nouvelle tâche à valider — ${task.title}`,
      html: `<p>Une nouvelle tâche "${task.title}" attend votre validation dans votre espace client.</p>`,
    });
  }
}

export async function setTaskStatus(taskId: string, statusSlug: TaskStatusSlug) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const statusId = await getStatusId(statusSlug);
  await db.task.update({ where: { id: taskId }, data: { statusId } });
  revalidateTaskPaths(task.clientId);

  if (statusSlug === TASK_STATUS.A_VALIDER) {
    await notifyClientUsersOfNewTaskToValidate(taskId);
  }
}

export async function validateTask(taskId: string) {
  const clientUser = await verifyClientSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.clientId !== clientUser.clientId) return;

  const statusId = await getStatusId(TASK_STATUS.BAT_VALIDE);
  await db.task.update({
    where: { id: taskId },
    data: { statusId, batValidatedAt: new Date() },
  });

  revalidateTaskPaths(clientUser.clientId);
}

export async function refuseTask(
  taskId: string,
  _prev: RefusalFormState,
  formData: FormData,
): Promise<RefusalFormState> {
  const clientUser = await verifyClientSession();

  const parsed = RefusalSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Le motif est requis." };
  }

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.clientId !== clientUser.clientId) {
    return { error: "Tâche introuvable." };
  }

  const statusId = await getStatusId(TASK_STATUS.A_MODIFIER);
  await db.task.update({
    where: { id: taskId },
    data: { statusId, refusalReason: parsed.data.reason },
  });

  await sendEmail({
    trigger: "refusal_confirmed",
    to: clientUser.email,
    subject: `Refus enregistré — ${task.title}`,
    html: `<p>Votre refus concernant "${task.title}" a bien été enregistré avec le motif suivant :</p><blockquote>${parsed.data.reason}</blockquote>`,
  });

  revalidateTaskPaths(clientUser.clientId);
  return undefined;
}

// Alternative au 7e statut "Abandonné" : un champ séparé plutôt que de
// rouvrir le cycle des 6 statuts verrouillé le 2026-07-13. Sort la tâche de
// toutes les vues actives (admin et espace client) sans perdre l'historique.
export async function archiveTask(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({ where: { id: taskId }, data: { archivedAt: new Date() } });
  revalidateTaskPaths(task.clientId);
}

export async function unarchiveTask(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({ where: { id: taskId }, data: { archivedAt: null } });
  revalidateTaskPaths(task.clientId);
}

// Suppression définitive : le cascade Prisma sur `Deliverable` nettoie les
// lignes DB, mais pas les fichiers sur le disque/S3 — il faut les effacer
// nous-mêmes avant de supprimer la tâche.
export async function deleteTask(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { deliverables: true },
  });
  if (!task) return;

  const storage = getStorageAdapter();
  for (const deliverable of task.deliverables) {
    await storage.delete(deliverable.storageKey);
  }

  await db.task.delete({ where: { id: taskId } });
  revalidateTaskPaths(task.clientId);
  redirect(`/admin/clients/${task.clientId}`);
}

// Miroir de `sendPaymentReminder` (src/lib/actions/payments.ts) : relance
// manuelle, pas de tâche planifiée dans ce projet.
export async function sendTaskReminder(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { status: true, client: { include: { users: true } } },
  });
  if (!task || !isTaskOverdue(task)) return;

  for (const user of task.client.users) {
    await sendEmail({
      trigger: "task_reminder",
      to: user.email,
      subject: `Rappel — ${task.title}`,
      html: `<p>La tâche "${task.title}" a dépassé son échéance de livraison et n'est pas encore terminée. N'hésitez pas à nous recontacter si besoin.</p>`,
    });
  }

  await db.task.update({ where: { id: taskId }, data: { lastReminderAt: new Date() } });
  revalidateTaskPaths(task.clientId);
}
