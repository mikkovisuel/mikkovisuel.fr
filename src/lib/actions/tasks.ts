"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyAdminSession, verifyClientSession, assertNotDemo } from "@/lib/dal";
import { sendEmail, getAdminEmails } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { getStorageAdapter } from "@/lib/storage";
import { isTaskOverdue, taskDateFormatter } from "@/lib/tasks";
import { notifiableEmails, notifiableEmailsFromContacts } from "@/lib/clients";
import { isWorkLocked } from "@/lib/payment-locks";

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

// Bascule les BAT de la tâche côté "livrable final" dès que le statut
// devient "BAT validé" (demande du 2026-07-31) : un `Deliverable.kind` reste
// "bat" tant qu'il attend une décision, mais une fois validé ce n'est plus
// une épreuve, c'est le rendu définitif — il n'a donc plus de raison
// d'être filigrané pour le client (voir `isBatForClient` dans
// /api/fichiers/livrables/[id]/route.ts, qui ne filigrane que kind==="bat")
// ni de rester dans la section "BAT" de la fiche tâche.
//
// Appelée depuis les 3 chemins qui peuvent mener à ce statut
// (`validateTask`, `validateTaskByAdmin`, et `setTaskStatus` — glissé-déposé
// Kanban ou changement direct du menu de statut) plutôt que dupliquée,
// pour qu'aucun des trois n'oublie la bascule.
async function promoteBatDeliverablesToFinal(taskId: string) {
  await db.deliverable.updateMany({
    where: { taskId, kind: "bat" },
    data: { kind: "final" },
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

// Champ `estimatedMinutes` du formulaire : optionnel, entier positif. Vit
// hors de `TaskSchema` parce que le formulaire client (`createTaskByClient`)
// ne l'expose jamais — c'est un suivi interne, un client ne fixe pas le
// temps que Mikko va passer. Partagé par la création et l'édition admin
// pour que les deux valident à l'identique.
function parseEstimatedMinutes(
  formData: FormData,
): { value: number | null } | { error: string } {
  const raw = formData.get("estimatedMinutes");
  if (typeof raw !== "string" || raw.trim() === "") return { value: null };
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { error: "Le temps estimé doit être un nombre de minutes positif." };
  }
  return { value: parsed };
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

  const estimated = parseEstimatedMinutes(formData);
  if ("error" in estimated) return { error: estimated.error };

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
      estimatedMinutes: estimated.value,
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
  const estimated = parseEstimatedMinutes(formData);
  if ("error" in estimated) return { error: estimated.error };

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
      estimatedMinutes: estimated.value,
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
    include: { client: { include: { contacts: { include: { contact: true } } } } },
  });
  if (!task) return;

  for (const to of notifiableEmailsFromContacts(task.client.contacts)) {
    await sendEmail({
      trigger: "new_task_to_validate",
      to,
      subject: `Nouvelle tâche à valider — ${task.title}`,
      html: `<p>Une nouvelle tâche "${escapeHtml(task.title)}" attend votre validation dans votre espace client.</p>`,
    });
  }
}

export async function setTaskStatus(taskId: string, statusSlug: TaskStatusSlug) {
  const admin = await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId }, include: { status: true, client: true } });
  if (!task) return;

  // Verrou "avant de travailler" : bloque réellement toute sortie du statut
  // initial ("Nouveau") tant que le paiement n'est pas confirmé — voir
  // `isWorkLocked` (src/lib/payment-locks.ts). Confirmé avec le client :
  // un vrai blocage, pas un simple rappel visuel. Sans effet une fois la
  // tâche déjà sortie de "Nouveau" (le verrou ne concerne que le démarrage).
  if (
    task.status.slug === TASK_STATUS.NOUVEAU &&
    statusSlug !== TASK_STATUS.NOUVEAU &&
    isWorkLocked(task, task.client)
  ) {
    return;
  }

  const statusItem = await getStatusItem(statusSlug);
  await db.task.update({
    where: { id: taskId },
    data: {
      statusId: statusItem.id,
      // Une tâche terminée n'a plus besoin d'être mise en avant — voir
      // `Task.pinnedAt`. Pas d'effet si elle n'était pas épinglée.
      ...(statusSlug === TASK_STATUS.TERMINE ? { pinnedAt: null } : {}),
      // Le motif de refus courant n'a plus lieu d'être affiché une fois le
      // BAT validé, ou dès que la tâche est remise en validation après un
      // refus (bouton "Mettre en validation" depuis "À modifier") — le
      // bandeau rouge de la fiche tâche concerne un refus qu'on est
      // justement en train de corriger, il n'a plus de raison de rester
      // affiché. L'historique, lui, reste consultable dans
      // `TaskRefusalHistory` (écrit au moment du refus, dans `refuseTask`),
      // jamais supprimé ni touché ici.
      ...(statusSlug === TASK_STATUS.BAT_VALIDE || statusSlug === TASK_STATUS.A_VALIDER
        ? { refusalReason: null, refusedAt: null }
        : {}),
    },
  });
  if (statusSlug === TASK_STATUS.BAT_VALIDE) {
    await promoteBatDeliverablesToFinal(taskId);
  }
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

const PAYMENT_LOCK_OVERRIDES = new Set(["locked", "unlocked"]);

// Bascule l'exception ponctuelle "Verrou paiement" pour CET évènement —
// voir `isDeliverablesLocked` (src/lib/payment-locks.ts). Valeur vide =
// retour au réglage par défaut du client.
export async function setTaskDeliverablesLockOverride(taskId: string, value: string) {
  await verifyAdminSession();

  const override = PAYMENT_LOCK_OVERRIDES.has(value) ? value : null;
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({ where: { id: taskId }, data: { deliverablesLockOverride: override } });
  revalidateTaskPaths(task.clientId);
}

// Confirmation manuelle de paiement pour cet évènement — voir le commentaire
// sur `Task.deliverablesPaymentConfirmedAt` (prisma/schema.prisma) : posée à
// la main, indépendamment du moyen de paiement effectivement utilisé.
export async function confirmTaskDeliverablesPayment(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({ where: { id: taskId }, data: { deliverablesPaymentConfirmedAt: new Date() } });
  revalidateTaskPaths(task.clientId);
}

// Annule la confirmation ci-dessus (erreur de saisie, remboursement...) — le
// verrou reprend effet immédiatement si le réglage client/évènement
// l'impose toujours.
export async function unconfirmTaskDeliverablesPayment(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({ where: { id: taskId }, data: { deliverablesPaymentConfirmedAt: null } });
  revalidateTaskPaths(task.clientId);
}

// Même trio que ci-dessus, pour le verrou "avant de travailler" — voir
// `isWorkLocked` (src/lib/payment-locks.ts) et la garde dans `setTaskStatus`
// ci-dessous, qui bloque réellement la sortie du statut "Nouveau".
export async function setTaskWorkLockOverride(taskId: string, value: string) {
  await verifyAdminSession();

  const override = PAYMENT_LOCK_OVERRIDES.has(value) ? value : null;
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({ where: { id: taskId }, data: { workLockOverride: override } });
  revalidateTaskPaths(task.clientId);
}

export async function confirmTaskWorkPayment(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({ where: { id: taskId }, data: { workPaymentConfirmedAt: new Date() } });
  revalidateTaskPaths(task.clientId);
}

export async function unconfirmTaskWorkPayment(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await db.task.update({ where: { id: taskId }, data: { workPaymentConfirmedAt: null } });
  revalidateTaskPaths(task.clientId);
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
  await promoteBatDeliverablesToFinal(taskId);
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
  | { type: "CLIENT_USER"; name: string; email: string | null; emailNotificationsEnabled: boolean }
  | {
      type: "ADMIN";
      clientContacts: { emailNotificationsEnabled: boolean; contact: { email: string | null } }[];
    };

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
      ? `<ul>${deliverableNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>`
      : "<p>Aucun livrable associé.</p>";
  const validatedByLabel =
    actor.type === "CLIENT_USER"
      ? `${escapeHtml(actor.name)}${actor.email ? ` (${escapeHtml(actor.email)})` : ""}`
      : "Mikko (admin)";
  const html = `
    <p>Le BAT de la tâche "${escapeHtml(taskTitle)}" a été validé.</p>
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
    recipients.push(...(await getAdminEmails()));
    recipients.push(...notifiableEmails([actor]));
  } else {
    recipients.push(...notifiableEmailsFromContacts(actor.clientContacts));
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
    include: {
      deliverables: true,
      client: { include: { contacts: { include: { contact: true } } } },
    },
  });
  if (!task) return;

  const statusItem = await getStatusItem(TASK_STATUS.BAT_VALIDE);
  const validatedAt = new Date();
  await db.task.update({
    where: { id: taskId },
    data: { statusId: statusItem.id, batValidatedAt: validatedAt, refusalReason: null, refusedAt: null },
  });
  await promoteBatDeliverablesToFinal(taskId);
  await logTaskStatusChange(taskId, statusItem, { type: "ADMIN", id: admin.id, name: "Mikko" });

  await notifyBatValidated(task.title, task.deliverables.map((d) => d.fileName), validatedAt, {
    type: "ADMIN",
    clientContacts: task.client.contacts,
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

  // Confirmation au contact qui vient de refuser. Il est connecté, donc il a
  // forcément une adresse — le test garde malgré tout l'envoi cohérent avec
  // le reste du fichier plutôt que de forcer le type.
  if (clientUser.email) {
    await sendEmail({
      trigger: "refusal_confirmed",
      to: clientUser.email,
      subject: `Refus enregistré — ${task.title}`,
      html: `<p>Votre refus concernant "${escapeHtml(task.title)}" a bien été enregistré avec le motif suivant :</p><blockquote>${escapeHtml(parsed.data.reason)}</blockquote>`,
    });
  }

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
    include: { client: { include: { contacts: { include: { contact: true } } } } },
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

  for (const to of notifiableEmailsFromContacts(task.client.contacts)) {
    await sendEmail({
      trigger: "refusal_confirmed",
      to,
      subject: `Refus enregistré — ${task.title}`,
      html: `<p>Le refus concernant "${escapeHtml(task.title)}" a bien été enregistré par Mikko, avec le motif suivant :</p><blockquote>${escapeHtml(parsed.data.reason)}</blockquote>`,
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
    include: { status: true, client: { include: { contacts: { include: { contact: true } } } } },
  });
  if (!task || !isTaskOverdue(task)) return;

  for (const to of notifiableEmailsFromContacts(task.client.contacts)) {
    await sendEmail({
      trigger: "task_reminder",
      to,
      subject: `Rappel — ${task.title}`,
      html: `<p>La tâche "${escapeHtml(task.title)}" a dépassé son échéance de livraison et n'est pas encore terminée. N'hésitez pas à nous recontacter si besoin.</p>`,
    });
  }

  await db.task.update({ where: { id: taskId }, data: { lastReminderAt: new Date() } });
  revalidateTaskPaths(task.clientId);
}

// Recrée une tâche similaire (même client, titre, description, types,
// formats, temps estimé) sans reprendre ce qui est spécifique à l'exécution
// de l'originale : dates, historique de statut/refus, livrables, pièces
// jointes, commentaires, temps passé, checklist. Statut remis à "Nouveau".
export async function duplicateTask(taskId: string) {
  const admin = await verifyAdminSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { types: true, formats: true },
  });
  if (!task) return;

  const statusItem = await getStatusItem(TASK_STATUS.NOUVEAU);
  const copy = await db.task.create({
    data: {
      clientId: task.clientId,
      title: `${task.title} (copie)`,
      description: task.description,
      estimatedMinutes: task.estimatedMinutes,
      statusId: statusItem.id,
      types: { connect: task.types.map((type) => ({ id: type.id })) },
      formats: { connect: task.formats.map((format) => ({ id: format.id })) },
      createdByType: "ADMIN",
      createdById: admin.id,
    },
  });
  await logTaskStatusChange(copy.id, statusItem, { type: "ADMIN", id: admin.id, name: "Mikko" });

  revalidateTaskPaths(task.clientId);
  redirect(`/admin/taches/${copy.id}`);
}

// Checklist par tâche (sous-étapes cochables, ex. "logo reçu") — jamais
// exposée côté espace client. Ajoutée en fin de liste (`sortOrder` = max+1),
// pas de réordonnancement manuel pour l'instant.
export async function addChecklistItem(taskId: string, label: string) {
  await verifyAdminSession();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Le libellé est requis.");

  const last = await db.taskChecklistItem.findFirst({
    where: { taskId },
    orderBy: { sortOrder: "desc" },
  });
  const item = await db.taskChecklistItem.create({
    data: { taskId, label: trimmed, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  revalidatePath(`/admin/taches/${taskId}`);
  return item;
}

export async function toggleChecklistItem(id: string) {
  await verifyAdminSession();
  const item = await db.taskChecklistItem.findUnique({ where: { id } });
  if (!item) return;
  await db.taskChecklistItem.update({ where: { id }, data: { done: !item.done } });
  revalidatePath(`/admin/taches/${item.taskId}`);
}

export async function deleteChecklistItem(id: string) {
  await verifyAdminSession();
  const item = await db.taskChecklistItem.findUnique({ where: { id } });
  if (!item) return;
  await db.taskChecklistItem.delete({ where: { id } });
  revalidatePath(`/admin/taches/${item.taskId}`);
}

// Actions groupées de la vue Liste (sélection multi-lignes) — enveloppent
// simplement `setTaskStatus`/`archiveTask` par tâche plutôt que dupliquer
// leur logique (notifications, historique, jauge de temps remise à zéro...).
export async function bulkSetTaskStatus(taskIds: string[], statusSlug: TaskStatusSlug) {
  await Promise.all(taskIds.map((id) => setTaskStatus(id, statusSlug)));
}

export async function bulkArchiveTasks(taskIds: string[]) {
  await Promise.all(taskIds.map((id) => archiveTask(id)));
}
