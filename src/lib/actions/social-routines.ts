"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { SOCIAL_CATEGORY_LIST_KEY, TASK_TYPE_LIST_KEY } from "@/lib/dropdown-lists";
import {
  RoutineSchema,
  RoutineSetSchema,
  ApplyTemplateSchema,
  type SocialRoutineFormState,
} from "@/lib/validation/social-routines";

// Routines (2026-09-25) : la programmation récurrente du module Réseaux.
// Une routine appartient toujours à un **ensemble** (`SocialRoutineSet`),
// qui est soit celui d'un client, soit un **modèle** réutilisable sans
// client. Tout est réservé à l'admin.

function revalidateRoutines(clientId?: string | null) {
  revalidatePath("/admin/reseaux/routines");
  revalidatePath("/admin/reseaux");
  if (clientId) revalidatePath(`/admin/reseaux/clients/${clientId}`);
}

/** Champs de cadence et de contenu communs à la création et à la mise à jour. */
function routineDataFromForm(data: ReturnType<typeof RoutineSchema.parse>) {
  const number = (value: number | "" | undefined) => (value === "" || value === undefined ? null : value);
  return {
    title: data.title,
    cadence: data.cadence,
    weekdays: data.cadence === "weekly" || data.cadence === "biweekly" ? data.weekdays : [],
    // Semaine de référence du "une semaine sur deux" : celle de la création,
    // pour que l'alternance parte de maintenant.
    biweeklyAnchor: data.cadence === "biweekly" ? new Date() : null,
    monthDay: data.cadence === "monthly_day" ? number(data.monthDay) : null,
    monthWeek: data.cadence === "monthly_weekday" ? number(data.monthWeek) : null,
    monthWeekday: data.cadence === "monthly_weekday" ? number(data.monthWeekday) : null,
    time: data.time,
    activeFrom: data.activeFrom ? new Date(data.activeFrom) : null,
    activeUntil: data.activeUntil ? new Date(data.activeUntil) : null,
    createsReminder: data.createsReminder,
    createsDraft: data.createsDraft,
    createsTask: data.createsTask,
    createsAction: data.createsAction,
    leadDays: data.leadDays,
    networks: data.networks,
    format: data.format,
    captionTemplate: data.captionTemplate || null,
    hashtags: data.hashtags || null,
    taskTypeSlug: data.createsTask ? data.taskTypeSlug || null : null,
    taskLeadDays: data.createsTask ? number(data.taskLeadDays) : null,
    taskBrief: data.createsTask ? data.taskBrief || null : null,
    actionLeadDays: data.createsAction ? number(data.actionLeadDays) : null,
    actionBrief: data.createsAction ? data.actionBrief || null : null,
  };
}

function parseRoutineForm(formData: FormData) {
  return RoutineSchema.safeParse({
    title: formData.get("title"),
    cadence: formData.get("cadence"),
    weekdays: formData.getAll("weekdays"),
    monthDay: formData.get("monthDay") ?? "",
    monthWeek: formData.get("monthWeek") ?? "",
    monthWeekday: formData.get("monthWeekday") ?? "",
    time: formData.get("time"),
    activeFrom: formData.get("activeFrom") ?? "",
    activeUntil: formData.get("activeUntil") ?? "",
    createsReminder: formData.get("createsReminder") === "on",
    createsDraft: formData.get("createsDraft") === "on",
    createsTask: formData.get("createsTask") === "on",
    createsAction: formData.get("createsAction") === "on",
    leadDays: formData.get("leadDays"),
    networks: formData.getAll("networks"),
    format: formData.get("format") ?? undefined,
    categoryId: formData.get("categoryId") ?? "",
    captionTemplate: formData.get("captionTemplate") ?? "",
    hashtags: formData.get("hashtags") ?? "",
    taskTypeSlug: formData.get("taskTypeSlug") ?? "",
    taskLeadDays: formData.get("taskLeadDays") ?? "",
    taskBrief: formData.get("taskBrief") ?? "",
    actionLeadDays: formData.get("actionLeadDays") ?? "",
    actionBrief: formData.get("actionBrief") ?? "",
  });
}

/** Catégorie : vide ou un élément de la liste "Catégories de publication". */
async function categoryIdFromForm(raw: string | undefined): Promise<string | null | false> {
  if (!raw) return null;
  const item = await db.dropdownItem.findFirst({
    where: { id: raw, list: { key: SOCIAL_CATEGORY_LIST_KEY } },
    select: { id: true },
  });
  return item ? item.id : false;
}

async function taskTypeExists(slug: string | null): Promise<boolean> {
  if (!slug) return true;
  const item = await db.dropdownItem.findFirst({
    where: { slug, list: { key: TASK_TYPE_LIST_KEY } },
    select: { id: true },
  });
  return Boolean(item);
}

// --- Ensembles de routines -------------------------------------------------

// Trois sortes d'ensembles, à ne pas confondre :
//   - rattaché à un client (routines qui produisent pour lui) ;
//   - **interne** : sans client, mais bien exécuté (rappels et pense-bête) ;
//   - **modèle** : sans client et jamais exécuté, il sert à installer les
//     mêmes routines chez un nouveau client.
export async function createRoutineSet(
  clientId: string | null,
  isTemplate: boolean,
  _prev: SocialRoutineFormState,
  formData: FormData,
): Promise<SocialRoutineFormState> {
  await verifyAdminSession();
  const parsed = RoutineSetSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  if (clientId && !(await db.client.findUnique({ where: { id: clientId }, select: { id: true } }))) {
    return { error: "Client introuvable." };
  }

  await db.socialRoutineSet.create({
    data: { name: parsed.data.name, clientId, isTemplate: clientId === null && isTemplate },
  });
  revalidateRoutines(clientId);
  return { saved: true };
}

export async function renameRoutineSet(
  setId: string,
  _prev: SocialRoutineFormState,
  formData: FormData,
): Promise<SocialRoutineFormState> {
  await verifyAdminSession();
  const parsed = RoutineSetSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const set = await db.socialRoutineSet.findUnique({ where: { id: setId } });
  if (!set) return { error: "Calendrier introuvable." };

  await db.socialRoutineSet.update({ where: { id: setId }, data: { name: parsed.data.name } });
  revalidateRoutines(set.clientId);
  return { saved: true };
}

/** Met en pause (ou réactive) toutes les routines de l'ensemble d'un coup. */
export async function toggleRoutineSet(setId: string) {
  await verifyAdminSession();
  const set = await db.socialRoutineSet.findUnique({ where: { id: setId } });
  if (!set) return;
  await db.socialRoutineSet.update({ where: { id: setId }, data: { active: !set.active } });
  revalidateRoutines(set.clientId);
}

export async function deleteRoutineSet(setId: string) {
  await verifyAdminSession();
  const set = await db.socialRoutineSet.findUnique({ where: { id: setId } });
  if (!set) return;
  await db.socialRoutineSet.delete({ where: { id: setId } });
  revalidateRoutines(set.clientId);
}

/**
 * Enregistre un ensemble existant comme **modèle** réutilisable : copie
 * indépendante, sans client, que l'on pourra appliquer à n'importe qui.
 */
export async function saveRoutineSetAsTemplate(setId: string) {
  await verifyAdminSession();
  const set = await db.socialRoutineSet.findUnique({ where: { id: setId }, include: { routines: true } });
  if (!set) return;

  await db.socialRoutineSet.create({
    data: {
      name: `${set.name} (modèle)`,
      isTemplate: true,
      routines: {
        create: set.routines.map(({ id: _id, setId: _setId, createdAt: _createdAt, lastRunFor: _lastRunFor, ...routine }) => ({
          ...routine,
          // Un modèle ne garde aucune trace d'exécution.
          lastRunFor: null,
        })),
      },
    },
  });
  revalidateRoutines(set.clientId);
}

/** Applique un modèle à un client : copie ses routines dans un nouvel ensemble. */
export async function applyRoutineTemplate(
  _prev: SocialRoutineFormState,
  formData: FormData,
): Promise<SocialRoutineFormState> {
  await verifyAdminSession();
  const parsed = ApplyTemplateSchema.safeParse({
    templateSetId: formData.get("templateSetId"),
    clientId: formData.get("clientId"),
    name: formData.get("name") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const [template, client] = await Promise.all([
    db.socialRoutineSet.findUnique({ where: { id: parsed.data.templateSetId }, include: { routines: true } }),
    db.client.findUnique({ where: { id: parsed.data.clientId }, select: { id: true } }),
  ]);
  if (!template) return { error: "Modèle introuvable." };
  if (!client) return { error: "Client introuvable." };
  if (template.routines.length === 0) return { error: "Ce modèle ne contient aucune routine." };

  await db.socialRoutineSet.create({
    data: {
      name: parsed.data.name || template.name.replace(/\s*\(modèle\)$/, ""),
      clientId: client.id,
      routines: {
        create: template.routines.map(({ id: _id, setId: _setId, createdAt: _createdAt, lastRunFor: _lastRunFor, ...routine }) => ({
          ...routine,
          lastRunFor: null,
        })),
      },
    },
  });
  revalidateRoutines(client.id);
  return { saved: true };
}

// --- Routines ---------------------------------------------------------------

export async function createRoutine(
  setId: string,
  _prev: SocialRoutineFormState,
  formData: FormData,
): Promise<SocialRoutineFormState> {
  await verifyAdminSession();
  const set = await db.socialRoutineSet.findUnique({ where: { id: setId } });
  if (!set) return { error: "Calendrier introuvable." };

  const parsed = parseRoutineForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const categoryId = await categoryIdFromForm(parsed.data.categoryId);
  if (categoryId === false) return { error: "Catégorie inconnue." };
  const data = routineDataFromForm(parsed.data);
  if (data.createsTask && set.clientId && !data.taskTypeSlug) {
    return { error: "Choisissez le type de la tâche de travail." };
  }
  if (!(await taskTypeExists(data.taskTypeSlug))) return { error: "Type de tâche inconnu." };

  await db.socialRoutine.create({ data: { setId, categoryId, ...data } });
  revalidateRoutines(set.clientId);
  return { saved: true };
}

export async function updateRoutine(
  routineId: string,
  _prev: SocialRoutineFormState,
  formData: FormData,
): Promise<SocialRoutineFormState> {
  await verifyAdminSession();
  const routine = await db.socialRoutine.findUnique({ where: { id: routineId }, include: { set: true } });
  if (!routine) return { error: "Routine introuvable." };

  const parsed = parseRoutineForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const categoryId = await categoryIdFromForm(parsed.data.categoryId);
  if (categoryId === false) return { error: "Catégorie inconnue." };
  const data = routineDataFromForm(parsed.data);
  if (data.createsTask && routine.set.clientId && !data.taskTypeSlug) {
    return { error: "Choisissez le type de la tâche de travail." };
  }
  if (!(await taskTypeExists(data.taskTypeSlug))) return { error: "Type de tâche inconnu." };

  await db.socialRoutine.update({
    where: { id: routineId },
    data: {
      ...data,
      categoryId,
      // La semaine de référence n'est recalculée que si la cadence change :
      // modifier un titre ne doit pas décaler l'alternance en cours.
      biweeklyAnchor:
        data.cadence === "biweekly"
          ? routine.cadence === "biweekly"
            ? routine.biweeklyAnchor
            : new Date()
          : null,
    },
  });
  revalidateRoutines(routine.set.clientId);
  return { saved: true };
}

export async function toggleRoutine(routineId: string) {
  await verifyAdminSession();
  const routine = await db.socialRoutine.findUnique({ where: { id: routineId }, include: { set: true } });
  if (!routine) return;
  await db.socialRoutine.update({ where: { id: routineId }, data: { active: !routine.active } });
  revalidateRoutines(routine.set.clientId);
}

export async function deleteRoutine(routineId: string) {
  await verifyAdminSession();
  const routine = await db.socialRoutine.findUnique({ where: { id: routineId }, include: { set: true } });
  if (!routine) return;
  await db.socialRoutine.delete({ where: { id: routineId } });
  revalidateRoutines(routine.set.clientId);
}
