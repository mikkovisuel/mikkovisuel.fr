"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { ManualTimeEntrySchema, type ManualTimeEntryFormState } from "@/lib/validation/task";

// Le chronomètre est visible dans le header admin (voir `/admin/(protege)/
// layout.tsx`) — revalider "layout" plutôt qu'un chemin précis pour que le
// header se rafraîchisse quelle que soit la page admin actuellement ouverte.
function revalidateTimeTrackingPaths(taskId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/taches/${taskId}`);
  revalidatePath("/admin/taches");
}

// Un seul admin dans ce projet, donc un seul chronomètre actif à la fois :
// démarrer un nouveau chrono arrête automatiquement celui en cours, sur
// n'importe quelle tâche (même si c'est la même tâche — repart à zéro pour
// la session en cours, l'ancienne session est déjà comptée).
export async function startTaskTimer(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.archivedAt) return;

  const runningEntry = await db.taskTimeEntry.findFirst({ where: { endedAt: null } });
  const now = new Date();

  if (runningEntry) {
    await db.taskTimeEntry.update({ where: { id: runningEntry.id }, data: { endedAt: now } });
  }
  await db.taskTimeEntry.create({ data: { taskId, startedAt: now } });

  revalidateTimeTrackingPaths(taskId);
  if (runningEntry && runningEntry.taskId !== taskId) {
    revalidateTimeTrackingPaths(runningEntry.taskId);
  }
}

export async function stopActiveTimer() {
  await verifyAdminSession();

  const runningEntry = await db.taskTimeEntry.findFirst({ where: { endedAt: null } });
  if (!runningEntry) return;

  await db.taskTimeEntry.update({
    where: { id: runningEntry.id },
    data: { endedAt: new Date() },
  });

  revalidateTimeTrackingPaths(runningEntry.taskId);
}

// Correction manuelle (oubli de lancer le chronomètre, session mal
// chronométrée...) — la session ajoutée démarre à midi le jour choisi,
// l'heure exacte n'a pas d'importance, seule la durée compte.
export async function addManualTimeEntry(
  taskId: string,
  _prev: ManualTimeEntryFormState,
  formData: FormData,
): Promise<ManualTimeEntryFormState> {
  await verifyAdminSession();

  const parsed = ManualTimeEntrySchema.safeParse({
    date: formData.get("date"),
    minutes: formData.get("minutes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const startedAt = new Date(`${parsed.data.date}T12:00:00`);
  if (Number.isNaN(startedAt.getTime())) {
    return { error: "Date invalide." };
  }
  const endedAt = new Date(startedAt.getTime() + parsed.data.minutes * 60_000);

  await db.taskTimeEntry.create({
    data: { taskId, startedAt, endedAt, manual: true },
  });

  revalidateTimeTrackingPaths(taskId);
  return undefined;
}

// Suppression d'une session (chronométrée ou manuelle) — correction en cas
// d'erreur, ex. chrono oublié en route toute une nuit.
export async function deleteTimeEntry(entryId: string) {
  await verifyAdminSession();

  const entry = await db.taskTimeEntry.findUnique({ where: { id: entryId } });
  if (!entry) return;

  await db.taskTimeEntry.delete({ where: { id: entryId } });
  revalidateTimeTrackingPaths(entry.taskId);
}
