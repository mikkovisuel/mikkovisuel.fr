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

// Le filtre à utiliser pour tout compteur ou toute liste représentant le
// travail en cours : client de démo exclu **et** tâches archivées exclues.
//
// Les deux doivent aller ensemble. Le tableau de bord n'excluait que le
// client de démo alors que la pastille du bandeau et la liste des tâches
// excluaient aussi les archivées : une tâche archivée en retard était donc
// comptée sur le tableau de bord sans apparaître nulle part ailleurs
// (signalé par le client le 2026-07-30 — "une tâche en retard affichée en
// plus"). Passer par cette constante plutôt que de réécrire le filtre à la
// main évite que les deux conventions redivergent.
export const ACTIVE_TASKS = {
  ...EXCLUDE_DEMO_CLIENT_TASKS,
  archivedAt: null,
} satisfies Prisma.TaskWhereInput;

// Minuit aujourd'hui (heure locale) — sert de seuil pour "en retard" au lieu
// de `new Date()` : une échéance fixée à aujourd'hui ne doit pas compter
// comme en retard tant que la journée n'est pas terminée (voir
// `isTaskDueToday`, qui la traite comme un cas à part, pas "en retard").
// Exporté pour que les requêtes Prisma (ex. le compteur du tableau de bord)
// utilisent le même seuil que l'affichage.
export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isTaskOverdue(task: { dueDate: Date | null; status: { slug: string } }) {
  return (
    task.dueDate !== null &&
    task.dueDate < startOfToday() &&
    task.status.slug !== TASK_STATUS.TERMINE
  );
}

// Échéance fixée à aujourd'hui — mis en évidence (bleu, gras) plutôt que
// traité comme "en retard", pour distinguer "encore dans les temps mais à
// livrer aujourd'hui" de "dépassé".
export function isTaskDueToday(task: { dueDate: Date | null; status: { slug: string } }) {
  return (
    task.dueDate !== null &&
    dueDateKey(task.dueDate) === dueDateKey(new Date()) &&
    task.status.slug !== TASK_STATUS.TERMINE
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

// Numéro de semaine ISO 8601 (semaine du jeudi, lundi = premier jour) —
// utilisé par la vue Calendrier pour afficher "Sem. XX" devant chaque ligne.
export function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7; // lundi = 0
  target.setUTCDate(target.getUTCDate() - dayNumber + 3); // jeudi de cette semaine
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

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

// Timeline de suivi côté espace client : les statuts verrouillés (voir
// TASK_STATUS) se replient sur 4 étapes visuelles — "BAT validé" et "À
// modifier" sont deux issues de l'étape "À valider" (validé vs à corriger),
// pas des étapes à part entière ; "Non commencé" (ajouté le 2026-07-21) se
// replie sur l'étape "Nouveau" (même chose du point de vue du client : la
// tâche n'a pas encore démarré).
//
// "Bloqué" (ajouté le 2026-07-31) se replie lui aussi sur "Nouveau", au
// même titre que "Non commencé" : il est placé avant "En cours" dans le
// cycle, donc du point de vue du client le travail n'a pas démarré. C'est
// un choix de repli, pas une omission — le client ne voit donc PAS qu'une
// tâche est bloquée, seul l'admin le voit. À rouvrir si le client doit être
// informé d'un blocage (il faudrait alors une 5e étape ou un état
// d'avertissement, comme celui déjà utilisé pour "À modifier").
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
      case TASK_STATUS.NON_COMMENCE:
      case TASK_STATUS.BLOQUE:
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
