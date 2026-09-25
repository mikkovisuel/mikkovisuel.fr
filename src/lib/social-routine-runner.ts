import "server-only";
import { db } from "@/lib/db";
import { sendEmailToAdmins } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import {
  formatLabel,
  formatSchedule,
  isSameParisDay,
  networkLabel,
  toParisDateTimeLocal,
} from "@/lib/social-posts";
import { nextRoutineOccurrence } from "@/lib/social-routines";
import { TASK_STATUS, TASK_STATUS_LIST_KEY, TASK_TYPE_LIST_KEY } from "@/lib/dropdown-lists";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mikkovisuel.fr";

// Exécution des routines (2026-09-25), appelée par la tâche planifiée
// horaire existante — aucune tâche planifiée supplémentaire (limite
// Scalingo de 5).
//
// Pour chaque routine active d'un ensemble actif : on calcule la prochaine
// occurrence, et dès qu'on entre dans sa fenêtre d'avance (`leadDays`), on
// produit ce qui est coché. `lastRunFor` garantit qu'une occurrence n'est
// jamais traitée deux fois, même si la tâche horaire repasse.
//
// Deux cas selon le rattachement :
//   - routine **d'un client** : brouillon de publication et/ou tâche
//     interne rattachés à ce client ;
//   - routine **interne** (sans client, ex. "lundi : programmer la
//     semaine") : ligne ajoutée au pense-bête de la page Tâches, faute de
//     client auquel rattacher une tâche.

/** Remplace les variables d'un texte de routine. */
function fillTemplate(text: string, values: { client: string; date: string }): string {
  return text.replaceAll("{client}", values.client).replaceAll("{date}", values.date);
}

async function createRoutineDraft(
  routine: {
    id: string;
    title: string;
    networks: string[];
    format: string;
    categoryId: string | null;
    captionTemplate: string | null;
    hashtags: string | null;
  },
  clientId: string,
  clientName: string,
  occurrence: Date,
): Promise<string> {
  const values = { client: clientName, date: formatSchedule(occurrence) };
  const post = await db.socialPost.create({
    data: {
      clientId,
      title: fillTemplate(routine.title, values),
      networks: routine.networks.length > 0 ? routine.networks : ["instagram"],
      format: routine.format,
      caption: routine.captionTemplate ? fillTemplate(routine.captionTemplate, values) : null,
      hashtags: routine.hashtags,
      categoryId: routine.categoryId,
      scheduledAt: occurrence,
    },
  });
  return post.id;
}

/** Tâche de travail d'une routine de client — interne, jamais vue du client. */
async function createRoutineTask(
  routine: { title: string; taskTypeSlug: string | null; taskLeadDays: number | null; taskBrief: string | null },
  clientId: string,
  occurrence: Date,
  adminId: string,
): Promise<void> {
  if (!routine.taskTypeSlug) return;
  const dueDate = new Date(
    `${toParisDateTimeLocal(occurrence).slice(0, 10)}T00:00:00.000Z`,
  );
  dueDate.setUTCDate(dueDate.getUTCDate() - (routine.taskLeadDays ?? 0));

  const [statusList, type] = await Promise.all([
    db.dropdownList.findUniqueOrThrow({ where: { key: TASK_STATUS_LIST_KEY } }),
    db.dropdownItem.findFirst({ where: { slug: routine.taskTypeSlug, list: { key: TASK_TYPE_LIST_KEY } } }),
  ]);
  if (!type) return;
  const status = await db.dropdownItem.findUniqueOrThrow({
    where: { listId_slug: { listId: statusList.id, slug: TASK_STATUS.NOUVEAU } },
  });

  const task = await db.task.create({
    data: {
      clientId,
      title: routine.title,
      description: routine.taskBrief,
      dueDate,
      eventDate: occurrence,
      statusId: status.id,
      types: { connect: [{ id: type.id }] },
      createdByType: "ADMIN",
      createdById: adminId,
      internal: true,
    },
  });
  await db.taskStatusHistory.create({
    data: {
      taskId: task.id,
      statusSlug: status.slug,
      statusLabel: status.label,
      changedByType: "ADMIN",
      changedById: adminId,
      changedByName: "Mikko",
    },
  });
}

export async function runDueRoutines(now = new Date()) {
  const routines = await db.socialRoutine.findMany({
    where: { active: true, set: { active: true, isTemplate: false } },
    include: { set: { include: { client: { select: { id: true, name: true } } } } },
  });
  // Un seul admin "auteur" pour les tâches produites, comme les autres
  // créations automatiques du projet.
  const admin = await db.admin.findFirst({ select: { id: true } });

  const due: { title: string; clientName: string; occurrence: Date; link: string; produced: string[] }[] = [];
  let draftsCreated = 0;
  let tasksCreated = 0;
  let scratchpadCreated = 0;
  let actionsCreated = 0;
  let coveredCount = 0;
  const processed: { id: string; occurrence: Date }[] = [];

  for (const routine of routines) {
    const occurrence = nextRoutineOccurrence(routine, now);
    if (!occurrence) continue;
    if (routine.lastRunFor?.getTime() === occurrence.getTime()) continue;
    if (now.getTime() < occurrence.getTime() - routine.leadDays * 24 * 60 * 60 * 1000) continue;

    const client = routine.set.client;

    // Anti-doublon (règle conservée depuis les créneaux) : si une
    // publication existe déjà ce jour-là pour ce client, la routine ne
    // produit rien — le travail est déjà fait.
    if (client) {
      const window = 36 * 60 * 60 * 1000;
      const nearby = await db.socialPost.findMany({
        where: {
          clientId: client.id,
          scheduledAt: { gte: new Date(occurrence.getTime() - window), lte: new Date(occurrence.getTime() + window) },
        },
        select: { scheduledAt: true },
      });
      if (nearby.some((post) => post.scheduledAt && isSameParisDay(post.scheduledAt, occurrence))) {
        coveredCount++;
        processed.push({ id: routine.id, occurrence });
        continue;
      }
    }

    const produced: string[] = [];
    let link = `${SITE_URL}/admin/reseaux/routines`;

    if (client && routine.createsDraft) {
      const postId = await createRoutineDraft(routine, client.id, client.name, occurrence);
      draftsCreated++;
      produced.push("brouillon créé");
      link = `${SITE_URL}/admin/reseaux/${postId}`;
    } else if (client && routine.createsReminder) {
      const params = new URLSearchParams({
        clientId: client.id,
        titre: routine.title,
        format: routine.format,
        reseaux: routine.networks.join(","),
        date: toParisDateTimeLocal(occurrence),
      });
      link = `${SITE_URL}/admin/reseaux/nouveau?${params.toString()}`;
    }

    if (routine.createsAction) {
      // Action à cocher (2026-09-25) : posée `actionLeadDays` jours avant
      // l'occurrence, dans la liste "À faire" du module Réseaux.
      const dueAt = new Date(
        occurrence.getTime() - (routine.actionLeadDays ?? 0) * 24 * 60 * 60 * 1000,
      );
      await db.socialAction.create({
        data: {
          clientId: client?.id ?? null,
          title: routine.title,
          description: routine.actionBrief,
          dueAt,
          routineId: routine.id,
        },
      });
      actionsCreated++;
      produced.push("action à faire ajoutée");
      if (!routine.createsDraft) link = `${SITE_URL}/admin/reseaux?vue=afaire`;
    }

    if (routine.createsTask) {
      if (client && admin) {
        await createRoutineTask(routine, client.id, occurrence, admin.id);
        tasksCreated++;
        produced.push("tâche de travail créée");
      } else if (!client) {
        // Routine interne : pas de client auquel rattacher une tâche, la
        // ligne part dans le pense-bête de la page Tâches.
        const last = await db.scratchpadItem.aggregate({ _max: { sortOrder: true } });
        await db.scratchpadItem.create({
          data: { label: routine.title, sortOrder: (last._max.sortOrder ?? 0) + 1 },
        });
        scratchpadCreated++;
        produced.push("ajoutée au pense-bête");
        link = `${SITE_URL}/admin/taches`;
      }
    }

    if (routine.createsReminder) {
      due.push({
        title: routine.title,
        clientName: client?.name ?? "Interne",
        occurrence,
        link,
        produced,
      });
    }
    processed.push({ id: routine.id, occurrence });
  }

  if (due.length > 0) {
    const items = due
      .map(
        (item) => `
        <li>
          <strong>${escapeHtml(item.clientName)}</strong> — ${escapeHtml(item.title)}
          (${escapeHtml(formatSchedule(item.occurrence))})
          ${item.produced.length > 0 ? `— ${escapeHtml(item.produced.join(", "))}` : ""}
          — <a href="${item.link}">ouvrir</a>
        </li>`,
      )
      .join("");

    await sendEmailToAdmins({
      trigger: "social_routine_reminder",
      subject:
        due.length > 1 ? `${due.length} routines à préparer` : `Routine à préparer — ${due[0].title}`,
      html: `
      <p>${due.length > 1 ? "Ces routines arrivent" : "Cette routine arrive"} :</p>
      <ul>${items}</ul>
    `,
    });
  }

  // Marqué après coup, comme les autres rappels : `sendEmail` ne lève
  // jamais, un échec d'envoi ne doit pas relancer la production à l'heure
  // suivante.
  for (const { id, occurrence } of processed) {
    await db.socialRoutine.update({ where: { id }, data: { lastRunFor: occurrence } });
  }

  return {
    routineReminderCount: due.length,
    routineDraftsCreated: draftsCreated,
    routineTasksCreated: tasksCreated,
    routineScratchpadCreated: scratchpadCreated,
    routineActionsCreated: actionsCreated,
    routinesAlreadyCovered: coveredCount,
  };
}

/** Résumé d'une routine, pour l'email et les écrans. */
export function describeRoutineProduction(routine: {
  createsReminder: boolean;
  createsDraft: boolean;
  createsTask: boolean;
  createsAction: boolean;
  networks: string[];
  format: string;
  hasClient: boolean;
}): string {
  const parts: string[] = [];
  if (routine.createsDraft) {
    parts.push(
      `brouillon ${formatLabel(routine.format).toLowerCase()} (${routine.networks.map(networkLabel).join(", ") || "réseau à choisir"})`,
    );
  }
  if (routine.createsAction) parts.push("action à cocher");
  if (routine.createsTask) parts.push(routine.hasClient ? "tâche de travail" : "ligne au pense-bête");
  if (routine.createsReminder) parts.push("rappel email");
  return parts.join(" · ") || "rien";
}
