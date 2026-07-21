"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyAdminSession, verifyClientSession, assertNotDemo } from "@/lib/dal";
import { sendEmail, getAdminEmail } from "@/lib/email/service";
import { getStorageAdapter } from "@/lib/storage";
import { isTaskOverdue, taskDateFormatter } from "@/lib/tasks";

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

// Retourne l'item complet (pas seulement son id) : `label` est réutilisé
// pour dénormaliser `TaskStatusHistory.statusLabel` sans un second aller-
// retour DB à chaque changement de statut.
async function getStatusItem(slug: TaskStatusSlug) {
  const list = await db.dropdownList.findUniqueOrThrow({ where: { key: TASK_STATUS_LIST_KEY } });
  return db.dropdownItem.findUniqueOrThrow({
    where: { listId_slug: { listId: list.id, slug } },
  });
}

// Audit trail des changements de statut (qui, quand, vers quel statut) —
// couvre la création (statut initial "Nouveau") et tous les changements
// ultérieurs, admin comme client. Voir `TaskStatusHistory` dans le schéma.
async function logTaskStatusChange(
  taskId: string,
  status: { slug: string; label: string },
  actor: { type: "ADMIN" | "CLIENT_USER"; id: string; name: string },
) {
  await db.taskStatusHistory.create({
    data: {
      taskId,
      statusSlug: status.slug,
      statusLabel: status.label,
      changedByType: actor.type,
      changedById: actor.id,
      changedByName: actor.name,
    },
  });
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
  assertNotDemo(clientUser);

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

  const [statusItem, typeIds, formatIds] = await Promise.all([
    getStatusItem(TASK_STATUS.NOUVEAU),
    getDropdownItemIds(TASK_TYPE_LIST_KEY, parsed.data.types),
    getDropdownItemIds(TASK_FORMAT_LIST_KEY, parsed.data.formats),
  ]);

  const task = await db.task.create({
    data: {
      clientId: clientUser.clientId,
      title: parsed.data.title,
      description: parsed.data.description,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      statusId: statusItem.id,
      types: { connect: typeIds },
      formats: { connect: formatIds },
      createdByType: "CLIENT_USER",
      createdById: clientUser.id,
    },
  });
  await logTaskStatusChange(task.id, statusItem, {
    type: "CLIENT_USER",
    id: clientUser.id,
    name: clientUser.name,
  });

  const storage = getStorageAdapter();
  // En parallèle plutôt que fichier par fichier : avec plusieurs pièces
  // jointes (ex. 10 photos), un envoi séquentiel vers le stockage S3 peut
  // prendre assez de temps pour dépasser le délai d'attente du routeur
  // avant que la réponse ne revienne au client.
  await Promise.all(
    attachmentFiles.map(async (file) => {
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
    }),
  );

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

  const [statusItem, typeIds, formatIds] = await Promise.all([
    getStatusItem(TASK_STATUS.NOUVEAU),
    getDropdownItemIds(TASK_TYPE_LIST_KEY, parsed.data.types),
    getDropdownItemIds(TASK_FORMAT_LIST_KEY, parsed.data.formats),
  ]);

  const task = await db.task.create({
    data: {
      clientId,
      title: parsed.data.title,
      description: parsed.data.description,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      statusId: statusItem.id,
      types: { connect: typeIds },
      formats: { connect: formatIds },
      createdByType: "ADMIN",
      createdById: adminId,
    },
  });
  await logTaskStatusChange(task.id, statusItem, { type: "ADMIN", id: adminId, name: "Mikko" });

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
  const estimatedMinutesRaw = formData.get("estimatedMinutes");
  let estimatedMinutes: number | null = null;
  if (typeof estimatedMinutesRaw === "string" && estimatedMinutesRaw.trim() !== "") {
    const parsedMinutes = Number.parseInt(estimatedMinutesRaw, 10);
    if (!Number.isInteger(parsedMinutes) || parsedMinutes < 0) {
      return { error: "Le temps estimé doit être un nombre de minutes positif." };
    }
    estimatedMinutes = parsedMinutes;
  }

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
      estimatedMinutes,
      types: { set: typeIds },
      formats: { set: formatIds },
    },
  });

  revalidateTaskPaths(task.clientId);
  redirect("/admin/taches");
}

async function notifyClientUsersOfNewTaskToValidate(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { client: { include: { users: true } } },
  });
  if (!task) return;

  for (const user of task.client.users) {
    if (!user.emailNotificationsEnabled) continue;
    await sendEmail({
      trigger: "new_task_to_validate",
      to: user.email,
      subject: `Nouvelle tâche à valider — ${task.title}`,
      html: `<p>Une nouvelle tâche "${task.title}" attend votre validation dans votre espace client.</p>`,
    });
  }
}

export async function setTaskStatus(taskId: string, statusSlug: TaskStatusSlug) {
  const admin = await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const statusItem = await getStatusItem(statusSlug);
  await db.task.update({
    where: { id: taskId },
    data: {
      statusId: statusItem.id,
      // Une tâche terminée n'a plus besoin d'être mise en avant — voir
      // `Task.pinnedAt`. Pas d'effet si elle n'était pas épinglée.
      ...(statusSlug === TASK_STATUS.TERMINE ? { pinnedAt: null } : {}),
      // Le motif de refus courant n'a plus lieu d'être affiché une fois le
      // BAT validé — il reste consultable dans `TaskRefusalHistory` (écrit
      // au moment du refus, dans `refuseTask`), jamais supprimé.
      ...(statusSlug === TASK_STATUS.BAT_VALIDE ? { refusalReason: null, refusedAt: null } : {}),
    },
  });
  await logTaskStatusChange(taskId, statusItem, { type: "ADMIN", id: admin.id, name: "Mikko" });

  revalidateTaskPaths(task.clientId);
  if (statusSlug === TASK_STATUS.TERMINE) {
    revalidatePath("/admin");
  }

  if (statusSlug === TASK_STATUS.A_VALIDER) {
    await notifyClientUsersOfNewTaskToValidate(taskId);
  }
}

// Épinglage manuel (bouton une pastille dans les vues admin) — un clic pour
// épingler/désépingler, pas de confirmation. Voir `Task.pinnedAt`.
export async function toggleTaskPin(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({
    where: { id: taskId },
    data: { pinnedAt: task.pinnedAt ? null : new Date() },
  });

  revalidateTaskPaths(task.clientId);
  revalidatePath("/admin");
}

export async function validateTask(taskId: string) {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  const task = await db.task.findUnique({ where: { id: taskId }, include: { deliverables: true } });
  if (!task || task.clientId !== clientUser.clientId) return;

  const statusItem = await getStatusItem(TASK_STATUS.BAT_VALIDE);
  const validatedAt = new Date();
  await db.task.update({
    where: { id: taskId },
    // Le motif de refus courant est effacé ici aussi (déjà conservé dans
    // `TaskRefusalHistory` si la tâche avait été refusée avant) — voir
    // `setTaskStatus` pour le même traitement quand l'admin change le statut
    // directement.
    data: { statusId: statusItem.id, batValidatedAt: validatedAt, refusalReason: null, refusedAt: null },
  });
  await logTaskStatusChange(taskId, statusItem, {
    type: "CLIENT_USER",
    id: clientUser.id,
    name: clientUser.name,
  });

  await notifyBatValidated(task.title, task.deliverables.map((d) => d.fileName), validatedAt, {
    type: "CLIENT_USER",
    name: clientUser.name,
    email: clientUser.email,
    emailNotificationsEnabled: clientUser.emailNotificationsEnabled,
  });

  revalidateTaskPaths(clientUser.clientId);
}

type ValidationActor =
  | { type: "CLIENT_USER"; name: string; email: string; emailNotificationsEnabled: boolean }
  | { type: "ADMIN"; clientUsers: { email: string; emailNotificationsEnabled: boolean }[] };

// Deux déclencheurs possibles : le client lui-même (`validateTask`) ou
// l'admin en son nom (`validateTaskByAdmin`, ex. accord donné par téléphone/
// whatsapp). Dans le premier cas, seul le compte qui a validé reçoit la
// confirmation (en plus de l'admin) ; dans le second, tous les profils du
// client abonnés aux notifications la reçoivent (pas de compte précis à
// l'origine de l'action), et l'admin ne se notifie pas lui-même.
async function notifyBatValidated(
  taskTitle: string,
  deliverableNames: string[],
  validatedAt: Date,
  actor: ValidationActor,
) {
  const validatedAtLabel = taskDateFormatter.format(validatedAt);
  const deliverablesHtml =
    deliverableNames.length > 0
      ? `<ul>${deliverableNames.map((name) => `<li>${name}</li>`).join("")}</ul>`
      : "<p>Aucun livrable associé.</p>";
  const validatedByLabel = actor.type === "CLIENT_USER" ? `${actor.name} (${actor.email})` : "Mikko (admin)";
  const html = `
    <p>Le BAT de la tâche "${taskTitle}" a été validé.</p>
    <p><strong>Date :</strong> ${validatedAtLabel}</p>
    <p><strong>Validé par :</strong> ${validatedByLabel}</p>
    <p><strong>Livrables validés :</strong></p>
    ${deliverablesHtml}
  `;

  const recipients: string[] = [];
  if (actor.type === "CLIENT_USER") {
    // L'admin reçoit toujours la confirmation ; le client qui vient de
    // valider ne la reçoit que si ses notifications email sont actives (la
    // préférence s'applique même à sa propre action, pas seulement aux
    // relances).
    const adminEmail = await getAdminEmail();
    if (adminEmail) recipients.push(adminEmail);
    if (actor.emailNotificationsEnabled) recipients.push(actor.email);
  } else {
    for (const user of actor.clientUsers) {
      if (user.emailNotificationsEnabled) recipients.push(user.email);
    }
  }

  for (const to of recipients) {
    await sendEmail({
      trigger: "bat_validated",
      to,
      subject: "Validation du BAT faite !",
      html,
    });
  }
}

// Miroir de `validateTask`, déclenché par l'admin plutôt que le client (ex.
// accord donné par téléphone/WhatsApp) — voir `ValidationActor` pour la
// différence de notification.
export async function validateTaskByAdmin(taskId: string) {
  const admin = await verifyAdminSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { deliverables: true, client: { include: { users: true } } },
  });
  if (!task) return;

  const statusItem = await getStatusItem(TASK_STATUS.BAT_VALIDE);
  const validatedAt = new Date();
  await db.task.update({
    where: { id: taskId },
    data: { statusId: statusItem.id, batValidatedAt: validatedAt, refusalReason: null, refusedAt: null },
  });
  await logTaskStatusChange(taskId, statusItem, { type: "ADMIN", id: admin.id, name: "Mikko" });

  await notifyBatValidated(task.title, task.deliverables.map((d) => d.fileName), validatedAt, {
    type: "ADMIN",
    clientUsers: task.client.users,
  });

  revalidateTaskPaths(task.clientId);
}

export async function refuseTask(
  taskId: string,
  _prev: RefusalFormState,
  formData: FormData,
): Promise<RefusalFormState> {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  const parsed = RefusalSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Le motif est requis." };
  }

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.clientId !== clientUser.clientId) {
    return { error: "Tâche introuvable." };
  }

  const statusItem = await getStatusItem(TASK_STATUS.A_MODIFIER);
  const refusedAt = new Date();
  await db.task.update({
    where: { id: taskId },
    data: { statusId: statusItem.id, refusalReason: parsed.data.reason, refusedAt },
  });
  // Conservé même après que le motif courant soit effacé au passage en "BAT
  // validé" (voir `setTaskStatus`/`validateTask`) — trace en historique,
  // jamais réécrite ni supprimée.
  await db.taskRefusalHistory.create({
    data: { taskId, reason: parsed.data.reason, refusedAt },
  });
  await logTaskStatusChange(taskId, statusItem, {
    type: "CLIENT_USER",
    id: clientUser.id,
    name: clientUser.name,
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

// Miroir de `refuseTask`, déclenché par l'admin plutôt que le client — tous
// les profils du client abonnés aux notifications sont prévenus (pas un
// compte précis, contrairement au refus déclenché par le client lui-même).
export async function refuseTaskByAdmin(
  taskId: string,
  _prev: RefusalFormState,
  formData: FormData,
): Promise<RefusalFormState> {
  const admin = await verifyAdminSession();

  const parsed = RefusalSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Le motif est requis." };
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { client: { include: { users: true } } },
  });
  if (!task) return { error: "Tâche introuvable." };

  const statusItem = await getStatusItem(TASK_STATUS.A_MODIFIER);
  const refusedAt = new Date();
  await db.task.update({
    where: { id: taskId },
    data: { statusId: statusItem.id, refusalReason: parsed.data.reason, refusedAt },
  });
  await db.taskRefusalHistory.create({
    data: { taskId, reason: parsed.data.reason, refusedAt },
  });
  await logTaskStatusChange(taskId, statusItem, { type: "ADMIN", id: admin.id, name: "Mikko" });

  for (const user of task.client.users) {
    if (!user.emailNotificationsEnabled) continue;
    await sendEmail({
      trigger: "refusal_confirmed",
      to: user.email,
      subject: `Refus enregistré — ${task.title}`,
      html: `<p>Le refus concernant "${task.title}" a bien été enregistré par Mikko, avec le motif suivant :</p><blockquote>${parsed.data.reason}</blockquote>`,
    });
  }

  revalidateTaskPaths(task.clientId);
  return undefined;
}

// Alternative à un statut "Abandonné" : un champ séparé plutôt qu'un statut
// de plus dans le cycle. Sort la tâche de toutes les vues actives (admin et
// espace client) sans perdre l'historique.
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
    if (!user.emailNotificationsEnabled) continue;
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
