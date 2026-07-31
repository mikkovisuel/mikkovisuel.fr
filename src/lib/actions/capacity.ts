"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { toCalendarDate, checkDueDateCapacity, type DueDateCapacityCheck } from "@/lib/capacity";

export type CapacityFormState = { error?: string; success?: boolean } | undefined;

// Enregistre la capacité d'une semaine entière en un seul geste (pop-up de
// /admin/planning, demande du 2026-07-31 : "je rentre mes plannings de
// charge par semaine et au jour") — un jour à 0 h saisi explicitement (ex.
// jour férié) est bien enregistré comme 0, distinct d'un jour jamais
// renseigné (voir `getCapacityCoverageDays` dans src/lib/capacity.ts).
export async function setWeekCapacity(
  _prev: CapacityFormState,
  formData: FormData,
): Promise<CapacityFormState> {
  await verifyAdminSession();

  const dates = formData.getAll("date") as string[];
  const hours = formData.getAll("hours") as string[];
  if (dates.length === 0 || dates.length !== hours.length) {
    return { error: "Formulaire invalide." };
  }

  const updates: { date: Date; availableMinutes: number }[] = [];
  for (let i = 0; i < dates.length; i++) {
    const parsedHours = Number.parseFloat(hours[i].replace(",", "."));
    if (Number.isNaN(parsedHours) || parsedHours < 0 || parsedHours > 24) {
      return { error: "Chaque jour doit être un nombre d'heures entre 0 et 24." };
    }
    updates.push({ date: toCalendarDate(new Date(dates[i])), availableMinutes: Math.round(parsedHours * 60) });
  }

  await Promise.all(
    updates.map((update) =>
      db.workCapacityDay.upsert({
        where: { date: update.date },
        create: update,
        update: { availableMinutes: update.availableMinutes },
      }),
    ),
  );

  revalidatePath("/admin/planning");
  return { success: true };
}

// Vérification live de la capacité à une échéance candidate, appelée depuis
// TaskEditForm à chaque changement du champ "Échéance" — voir
// src/lib/capacity.ts pour le calcul.
export async function checkTaskDueDateCapacity(
  dueDateIso: string,
  excludeTaskId?: string,
): Promise<DueDateCapacityCheck | null> {
  await verifyAdminSession();
  if (!dueDateIso) return null;
  const dueDate = new Date(dueDateIso);
  if (Number.isNaN(dueDate.getTime())) return null;
  return checkDueDateCapacity(dueDate, excludeTaskId);
}
