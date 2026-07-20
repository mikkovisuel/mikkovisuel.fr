import type { Prisma } from "@/generated/prisma/client";
import { TASK_STATUS } from "@/lib/dropdown-lists";

// Le client de démo (`Client.isDemo`) alimente un espace public pour les
// prospects (voir src/lib/actions/demo.ts) avec des tâches d'exemple — à
// exclure des vues de gestion courantes de l'admin (liste/kanban/calendrier/
// tableau de bord). En dur ici plutôt qu'un réglage admin dédié, pour rester
// simple : ses tâches restent consultables et gérables depuis la fiche du
// client de démo lui-même (`/admin/clients/[clientId]`), qui n'utilise pas
// ce filtre. Pour revenir en arrière, retirer ce filtre des requêtes qui
// l'utilisent (grep `EXCLUDE_DEMO_CLIENT_TASKS`).
export const EXCLUDE_DEMO_CLIENT_TASKS = {
  client: { isDemo: false },
} satisfies Prisma.TaskWhereInput;

export function isTaskOverdue(task: { dueDate: Date | null; status: { slug: string } }) {
  return (
    task.dueDate !== null && task.dueDate < new Date() && task.status.slug !== TASK_STATUS.TERMINE
  );
}

export const taskDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Format court pour les colonnes de tableau (16/07/2026), là où
// `taskDateFormatter` prendrait trop de place.
export const taskDateFormatterShort = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Avec l'heure, pour l'audit trail des statuts (qui a changé quoi, à quelle
// date et heure précises) — `taskDateFormatter` n'affiche que le jour.
export const taskDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// "YYYY-MM-DD" in local time (not toISOString, which shifts to UTC) so it
// matches the day the admin actually sees in the calendar grid.
export function dueDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Vue "Calendrier" (par date d'événement — la date du mariage/soirée/tournage
// du client, pas l'échéance interne de livraison — pour avoir une vue globale
// des demandes sur un calendrier). Les tâches sans date d'événement sont
// gardées à part plutôt que masquées, pour ne pas les perdre de vue.
export function groupTasksByEventDate<T extends { eventDate: Date | null }>(tasks: T[]) {
  const byDay = new Map<string, T[]>();
  const undated: T[] = [];

  for (const task of tasks) {
    if (!task.eventDate) {
      undated.push(task);
      continue;
    }
    const key = dueDateKey(task.eventDate);
    const list = byDay.get(key);
    if (list) list.push(task);
    else byDay.set(key, [task]);
  }

  return { byDay, undated };
}

// Vue "Par client", triée alphabétiquement comme la vue groupée Notion.
export function groupTasksByClient<T extends { client: { name: string } }>(tasks: T[]) {
  const byClient = new Map<string, T[]>();

  for (const task of tasks) {
    const key = task.client.name;
    const list = byClient.get(key);
    if (list) list.push(task);
    else byClient.set(key, [task]);
  }

  return [...byClient.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
}

// Timeline de suivi côté espace client : les 6 statuts verrouillés (voir
// TASK_STATUS) se replient sur 4 étapes visuelles — "BAT validé" et "À
// modifier" sont deux issues de l'étape "À valider" (validé vs à corriger),
// pas des étapes à part entière.
export const TASK_PROGRESS_STEPS = [
  { key: TASK_STATUS.NOUVEAU, label: "Nouveau" },
  { key: TASK_STATUS.EN_COURS, label: "En cours" },
  { key: TASK_STATUS.A_VALIDER, label: "À valider" },
  { key: TASK_STATUS.TERMINE, label: "Terminé" },
] as const;

export type TaskProgressStepState = "done" | "current" | "warning" | "upcoming";

export function taskProgressStates(statusSlug: string): TaskProgressStepState[] {
  const doneUpTo = (() => {
    switch (statusSlug) {
      case TASK_STATUS.NOUVEAU:
        return -1;
      case TASK_STATUS.EN_COURS:
        return 0;
      case TASK_STATUS.A_VALIDER:
      case TASK_STATUS.A_MODIFIER:
        return 1;
      case TASK_STATUS.BAT_VALIDE:
        return 2;
      case TASK_STATUS.TERMINE:
        return 3;
      default:
        return -1;
    }
  })();

  return TASK_PROGRESS_STEPS.map((_, index) => {
    if (index <= doneUpTo) return "done";
    if (index === doneUpTo + 1) {
      return statusSlug === TASK_STATUS.A_MODIFIER && index === 2 ? "warning" : "current";
    }
    return "upcoming";
  });
}

// Tri cliquable de la vue `Liste` (`/admin/taches`).
export const TASK_SORT_FIELDS = ["evenement", "echeance", "client", "tache", "statut"] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];
export type TaskSortDir = "asc" | "desc";

export function isTaskSortField(value: string | undefined): value is TaskSortField {
  return TASK_SORT_FIELDS.includes(value as TaskSortField);
}

// Objet `orderBy` Prisma correspondant. Le statut se trie par `sortOrder`
// (l'ordre du pipeline Nouveau → Terminé), pas alphabétiquement.
export function buildTaskOrderBy(field: TaskSortField, dir: TaskSortDir) {
  switch (field) {
    case "echeance":
      return { dueDate: { sort: dir, nulls: "last" as const } };
    case "client":
      return { client: { name: dir } };
    case "tache":
      return { title: dir };
    case "statut":
      return { status: { sortOrder: dir } };
    case "evenement":
    default:
      return { eventDate: { sort: dir, nulls: "last" as const } };
  }
}
