"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { SOCIAL_CATEGORY_LIST_KEY, TASK_STATUS, TASK_STATUS_LIST_KEY, TASK_TYPE_LIST_KEY } from "@/lib/dropdown-lists";
import { SOCIAL_POST_STATUS, formatDay, toParisDateTimeLocal } from "@/lib/social-posts";
import { fillPlanTemplate, stepDate } from "@/lib/social-plans";
import {
  ApplyPlanSchema,
  PlanSchema,
  PlanStepSchema,
  type SocialPlanFormState,
} from "@/lib/validation/social-plans";

// Plans de communication (2026-09-25) : modèles de séquences autour d'un
// évènement, appliqués à un client et une date. Admin uniquement.

function revalidatePlans(runId?: string) {
  revalidatePath("/admin/reseaux/plans");
  revalidatePath("/admin/reseaux");
  revalidatePath("/admin/taches");
  if (runId) revalidatePath(`/admin/reseaux/plans/suivi/${runId}`);
}

// --- Modèles de plan --------------------------------------------------------

export async function createPlan(
  _prev: SocialPlanFormState,
  formData: FormData,
): Promise<SocialPlanFormState> {
  await verifyAdminSession();
  const parsed = PlanSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  await db.socialPlan.create({
    data: { name: parsed.data.name, description: parsed.data.description || null },
  });
  revalidatePlans();
  return { saved: true };
}

export async function updatePlan(
  planId: string,
  _prev: SocialPlanFormState,
  formData: FormData,
): Promise<SocialPlanFormState> {
  await verifyAdminSession();
  const parsed = PlanSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const plan = await db.socialPlan.findUnique({ where: { id: planId }, select: { id: true } });
  if (!plan) return { error: "Plan introuvable." };

  await db.socialPlan.update({
    where: { id: planId },
    data: { name: parsed.data.name, description: parsed.data.description || null },
  });
  revalidatePlans();
  return { saved: true };
}

export async function deletePlan(planId: string) {
  await verifyAdminSession();
  const plan = await db.socialPlan.findUnique({ where: { id: planId }, select: { id: true } });
  if (!plan) return;
  // `SocialPlanRun.planId` est en SetNull : les plans déjà appliqués gardent
  // leur suivi (et leur nom dénormalisé) même si le modèle disparaît.
  await db.socialPlan.delete({ where: { id: planId } });
  revalidatePlans();
}

/** Copie d'un plan avec toutes ses étapes, pour partir d'un existant. */
export async function duplicatePlan(planId: string) {
  await verifyAdminSession();
  const plan = await db.socialPlan.findUnique({ where: { id: planId }, include: { steps: true } });
  if (!plan) return;

  await db.socialPlan.create({
    data: {
      name: `${plan.name} (copie)`,
      description: plan.description,
      steps: {
        create: plan.steps.map(({ id: _id, planId: _planId, ...step }) => step),
      },
    },
  });
  revalidatePlans();
}

// --- Étapes -----------------------------------------------------------------

function parseStepForm(formData: FormData) {
  return PlanStepSchema.safeParse({
    label: formData.get("label"),
    offsetDays: formData.get("offsetDays"),
    time: formData.get("time"),
    createsDraft: formData.get("createsDraft") === "on",
    createsReminder: formData.get("createsReminder") === "on",
    createsTask: formData.get("createsTask") === "on",
    createsAction: formData.get("createsAction") === "on",
    remindDaysBefore: formData.get("remindDaysBefore") ?? 2,
    networks: formData.getAll("networks"),
    format: formData.get("format") ?? undefined,
    categoryId: formData.get("categoryId") ?? "",
    titlePattern: formData.get("titlePattern"),
    captionTemplate: formData.get("captionTemplate") ?? "",
    hashtags: formData.get("hashtags") ?? "",
    taskTypeSlug: formData.get("taskTypeSlug") ?? "",
    taskLeadDays: formData.get("taskLeadDays") ?? "",
    taskBrief: formData.get("taskBrief") ?? "",
    actionLeadDays: formData.get("actionLeadDays") ?? "",
    actionBrief: formData.get("actionBrief") ?? "",
  });
}

async function stepDataFromForm(data: ReturnType<typeof PlanStepSchema.parse>) {
  const categoryId = data.categoryId
    ? (
        await db.dropdownItem.findFirst({
          where: { id: data.categoryId, list: { key: SOCIAL_CATEGORY_LIST_KEY } },
          select: { id: true },
        })
      )?.id ?? false
    : null;
  if (categoryId === false) return { error: "Catégorie inconnue." as const };

  if (data.taskTypeSlug) {
    const type = await db.dropdownItem.findFirst({
      where: { slug: data.taskTypeSlug, list: { key: TASK_TYPE_LIST_KEY } },
      select: { id: true },
    });
    if (!type) return { error: "Type de tâche inconnu." as const };
  }

  return {
    data: {
      label: data.label,
      offsetDays: data.offsetDays,
      time: data.time,
      createsDraft: data.createsDraft,
      createsReminder: data.createsReminder,
      createsTask: data.createsTask,
      createsAction: data.createsAction,
      remindDaysBefore: data.remindDaysBefore,
      networks: data.networks,
      format: data.format,
      categoryId,
      titlePattern: data.titlePattern,
      captionTemplate: data.captionTemplate || null,
      hashtags: data.hashtags || null,
      taskTypeSlug: data.createsTask ? data.taskTypeSlug || null : null,
      taskLeadDays: data.createsTask && data.taskLeadDays !== "" ? Number(data.taskLeadDays) : null,
      taskBrief: data.createsTask ? data.taskBrief || null : null,
      actionLeadDays: data.createsAction && data.actionLeadDays !== "" ? Number(data.actionLeadDays) : null,
      actionBrief: data.createsAction ? data.actionBrief || null : null,
    },
  };
}

export async function createPlanStep(
  planId: string,
  _prev: SocialPlanFormState,
  formData: FormData,
): Promise<SocialPlanFormState> {
  await verifyAdminSession();
  const plan = await db.socialPlan.findUnique({ where: { id: planId }, select: { id: true } });
  if (!plan) return { error: "Plan introuvable." };

  const parsed = parseStepForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const result = await stepDataFromForm(parsed.data);
  if ("error" in result) return { error: result.error };

  // Les étapes sont ordonnées par décalage : J-30 avant J-7, avant J+1.
  await db.socialPlanStep.create({ data: { planId, ...result.data, sortOrder: parsed.data.offsetDays } });
  revalidatePlans();
  return { saved: true };
}

export async function updatePlanStep(
  stepId: string,
  _prev: SocialPlanFormState,
  formData: FormData,
): Promise<SocialPlanFormState> {
  await verifyAdminSession();
  const step = await db.socialPlanStep.findUnique({ where: { id: stepId }, select: { id: true } });
  if (!step) return { error: "Étape introuvable." };

  const parsed = parseStepForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const result = await stepDataFromForm(parsed.data);
  if ("error" in result) return { error: result.error };

  await db.socialPlanStep.update({
    where: { id: stepId },
    data: { ...result.data, sortOrder: parsed.data.offsetDays },
  });
  revalidatePlans();
  return { saved: true };
}

export async function deletePlanStep(stepId: string) {
  await verifyAdminSession();
  const step = await db.socialPlanStep.findUnique({ where: { id: stepId }, select: { id: true } });
  if (!step) return;
  await db.socialPlanStep.delete({ where: { id: stepId } });
  revalidatePlans();
}

// --- Application d'un plan --------------------------------------------------

/**
 * Applique un plan à un évènement : crée les brouillons, les tâches et les
 * rappels des étapes cochées, et garde le tout relié dans un "plan appliqué"
 * (`SocialPlanRun`) pour le suivi et l'annulation groupée.
 */
export async function applyPlan(
  _prev: SocialPlanFormState,
  formData: FormData,
): Promise<SocialPlanFormState> {
  const admin = await verifyAdminSession();
  const parsed = ApplyPlanSchema.safeParse({
    planId: formData.get("planId"),
    clientId: formData.get("clientId"),
    eventName: formData.get("eventName"),
    eventPlace: formData.get("eventPlace") ?? "",
    eventDate: formData.get("eventDate"),
    stepIds: formData.getAll("stepIds"),
    sourceTaskId: formData.get("sourceTaskId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const [plan, client] = await Promise.all([
    db.socialPlan.findUnique({
      where: { id: parsed.data.planId },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    }),
    db.client.findUnique({ where: { id: parsed.data.clientId }, select: { id: true, name: true } }),
  ]);
  if (!plan) return { error: "Plan introuvable." };
  if (!client) return { error: "Client introuvable." };

  const steps = plan.steps.filter((step) => parsed.data.stepIds.includes(step.id));
  if (steps.length === 0) return { error: "Cochez au moins une étape." };

  const eventDate = new Date(`${parsed.data.eventDate}T12:00:00.000Z`);
  const sourceTask = parsed.data.sourceTaskId
    ? await db.task.findUnique({ where: { id: parsed.data.sourceTaskId }, select: { id: true } })
    : null;

  const run = await db.socialPlanRun.create({
    data: {
      planId: plan.id,
      planName: plan.name,
      clientId: client.id,
      eventName: parsed.data.eventName,
      eventPlace: parsed.data.eventPlace || null,
      eventDate,
      sourceTaskId: sourceTask?.id ?? null,
    },
  });

  const [statusList, taskTypes] = await Promise.all([
    db.dropdownList.findUniqueOrThrow({ where: { key: TASK_STATUS_LIST_KEY } }),
    db.dropdownItem.findMany({ where: { list: { key: TASK_TYPE_LIST_KEY } }, select: { id: true, slug: true } }),
  ]);
  const newStatus = await db.dropdownItem.findUniqueOrThrow({
    where: { listId_slug: { listId: statusList.id, slug: TASK_STATUS.NOUVEAU } },
  });

  for (const step of steps) {
    const dueAt = stepDate(eventDate, step.offsetDays, step.time);
    if (!dueAt) continue;

    const values = {
      evenement: parsed.data.eventName,
      client: client.name,
      lieu: parsed.data.eventPlace || "",
      date: formatDay(eventDate),
      etape: step.label,
    };

    let postId: string | null = null;
    if (step.createsDraft) {
      const post = await db.socialPost.create({
        data: {
          clientId: client.id,
          title: fillPlanTemplate(step.titlePattern, values).slice(0, 160),
          networks: step.networks.length > 0 ? step.networks : ["instagram"],
          format: step.format,
          caption: step.captionTemplate ? fillPlanTemplate(step.captionTemplate, values) : null,
          hashtags: step.hashtags,
          categoryId: step.categoryId,
          scheduledAt: dueAt,
        },
      });
      postId = post.id;
    }

    let taskId: string | null = null;
    if (step.createsTask && step.taskTypeSlug) {
      const type = taskTypes.find((item) => item.slug === step.taskTypeSlug);
      if (type) {
        const dueDate = new Date(`${toParisDateTimeLocal(dueAt).slice(0, 10)}T00:00:00.000Z`);
        dueDate.setUTCDate(dueDate.getUTCDate() - (step.taskLeadDays ?? 0));
        const task = await db.task.create({
          data: {
            clientId: client.id,
            title: fillPlanTemplate(step.titlePattern, values).slice(0, 160),
            description: step.taskBrief ? fillPlanTemplate(step.taskBrief, values) : null,
            dueDate,
            eventDate,
            statusId: newStatus.id,
            types: { connect: [{ id: type.id }] },
            createdByType: "ADMIN",
            createdById: admin.id,
            internal: true,
          },
        });
        await db.taskStatusHistory.create({
          data: {
            taskId: task.id,
            statusSlug: newStatus.slug,
            statusLabel: newStatus.label,
            changedByType: "ADMIN",
            changedById: admin.id,
            changedByName: "Mikko",
          },
        });
        taskId = task.id;
        // La publication créée par l'étape est reliée à sa tâche : les
        // livrables finaux rejoindront ses visuels au passage "Terminé".
        if (postId) {
          await db.socialPost.update({ where: { id: postId }, data: { sourceTaskId: task.id } });
        }
      }
    }

    let actionId: string | null = null;
    if (step.createsAction) {
      const action = await db.socialAction.create({
        data: {
          clientId: client.id,
          title: fillPlanTemplate(step.titlePattern, values).slice(0, 160),
          description: step.actionBrief ? fillPlanTemplate(step.actionBrief, values) : null,
          dueAt: new Date(dueAt.getTime() - (step.actionLeadDays ?? 0) * 24 * 60 * 60 * 1000),
        },
      });
      actionId = action.id;
    }

    await db.socialPlanRunItem.create({
      data: {
        runId: run.id,
        label: step.label,
        dueAt,
        remindAt: step.createsReminder
          ? new Date(dueAt.getTime() - step.remindDaysBefore * 24 * 60 * 60 * 1000)
          : null,
        postId,
        taskId,
        actionId,
      },
    });
  }

  revalidatePlans(run.id);
  redirect(`/admin/reseaux/plans/suivi/${run.id}`);
}

/**
 * Annule un plan appliqué : supprime les brouillons encore intacts et les
 * tâches pas encore terminées, garde tout le reste (une publication déjà
 * validée ou publiée ne disparaît jamais), et consigne l'annulation.
 */
export async function cancelPlanRun(runId: string) {
  await verifyAdminSession();
  const run = await db.socialPlanRun.findUnique({
    where: { id: runId },
    include: {
      items: {
        include: {
          post: { select: { id: true, status: true } },
          task: { select: { id: true, status: { select: { slug: true } } } },
          action: { select: { id: true, doneAt: true } },
        },
      },
    },
  });
  if (!run || run.canceledAt) return;

  for (const item of run.items) {
    if (item.post && (item.post.status === SOCIAL_POST_STATUS.IDEE || item.post.status === SOCIAL_POST_STATUS.REDACTION)) {
      await db.socialPost.delete({ where: { id: item.post.id } });
    }
    if (item.task && item.task.status.slug !== TASK_STATUS.TERMINE) {
      await db.task.delete({ where: { id: item.task.id } });
    }
    // Une action déjà cochée est un travail fait : elle reste.
    if (item.action && !item.action.doneAt) {
      await db.socialAction.delete({ where: { id: item.action.id } });
    }
  }

  await db.socialPlanRun.update({ where: { id: runId }, data: { canceledAt: new Date() } });
  revalidatePlans(runId);
}

export async function deletePlanRun(runId: string) {
  await verifyAdminSession();
  const run = await db.socialPlanRun.findUnique({ where: { id: runId }, select: { id: true } });
  if (!run) return;
  await db.socialPlanRun.delete({ where: { id: runId } });
  revalidatePlans();
  redirect("/admin/reseaux/plans");
}
