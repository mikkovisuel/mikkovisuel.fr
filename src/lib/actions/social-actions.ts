"use server";

import { revalidatePath } from "next/cache";
import { notifyAssignment, readAssigneeFromForm } from "@/lib/assignment";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { parseParisDateTimeLocal } from "@/lib/social-posts";
import { SocialActionSchema, type SocialActionFormState } from "@/lib/validation/social-actions";

// Actions du module Réseaux (2026-09-25) : la liste "À faire" par jour.
// Objet léger — pas de cycle de statut, juste fait / pas fait. Admin
// uniquement : rien de tout cela n'est visible du client.

function revalidateActions() {
  revalidatePath("/admin/reseaux");
  revalidatePath("/admin");
}

async function clientIdFromForm(raw: string | undefined): Promise<string | null | false> {
  if (!raw) return null;
  const client = await db.client.findUnique({ where: { id: raw }, select: { id: true } });
  return client ? client.id : false;
}

export async function createSocialAction(
  _prev: SocialActionFormState,
  formData: FormData,
): Promise<SocialActionFormState> {
  const admin = await verifyAdminSession();
  const parsed = SocialActionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    clientId: formData.get("clientId") ?? "",
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const dueAt = parseParisDateTimeLocal(parsed.data.dueAt);
  if (!dueAt) return { error: "Date invalide." };
  const clientId = await clientIdFromForm(parsed.data.clientId);
  if (clientId === false) return { error: "Client introuvable." };

  // Travail à deux (2026-10-20) : par défaut, attribuée à l'admin qui la crée.
  const assignee = await readAssigneeFromForm(formData);
  if ("error" in assignee) return { error: assignee.error };
  const assignedAdminId = assignee.value === undefined ? admin.id : assignee.value;

  const created = await db.socialAction.create({
    data: { title: parsed.data.title, description: parsed.data.description || null, dueAt, clientId, assignedAdminId },
  });
  await notifyAssignment({
    kind: "action",
    title: created.title,
    path: "/admin/reseaux?vue=afaire",
    assigneeId: assignedAdminId,
    byAdmin: { id: admin.id, email: admin.email },
  });
  revalidateActions();
  return { saved: true };
}

export async function updateSocialAction(
  actionId: string,
  _prev: SocialActionFormState,
  formData: FormData,
): Promise<SocialActionFormState> {
  const admin = await verifyAdminSession();
  const existing = await db.socialAction.findUnique({
    where: { id: actionId },
    select: { id: true, assignedAdminId: true },
  });
  if (!existing) return { error: "Action introuvable." };

  const parsed = SocialActionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    clientId: formData.get("clientId") ?? "",
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const dueAt = parseParisDateTimeLocal(parsed.data.dueAt);
  if (!dueAt) return { error: "Date invalide." };
  const clientId = await clientIdFromForm(parsed.data.clientId);
  if (clientId === false) return { error: "Client introuvable." };

  const assignee = await readAssigneeFromForm(formData);
  if ("error" in assignee) return { error: assignee.error };

  await db.socialAction.update({
    where: { id: actionId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt,
      clientId,
      ...(assignee.value !== undefined ? { assignedAdminId: assignee.value } : {}),
    },
  });
  if (assignee.value && assignee.value !== existing.assignedAdminId) {
    await notifyAssignment({
      kind: "action",
      title: parsed.data.title,
      path: "/admin/reseaux?vue=afaire",
      assigneeId: assignee.value,
      byAdmin: { id: admin.id, email: admin.email },
    });
  }
  revalidateActions();
  return { saved: true };
}

/** Coche / décoche : une action n'a pas d'autre état que fait ou pas fait. */
export async function toggleSocialAction(actionId: string) {
  await verifyAdminSession();
  const action = await db.socialAction.findUnique({ where: { id: actionId }, select: { doneAt: true } });
  if (!action) return;
  await db.socialAction.update({
    where: { id: actionId },
    data: { doneAt: action.doneAt ? null : new Date() },
  });
  revalidateActions();
}

export async function deleteSocialAction(actionId: string) {
  await verifyAdminSession();
  const action = await db.socialAction.findUnique({ where: { id: actionId }, select: { id: true } });
  if (!action) return;
  await db.socialAction.delete({ where: { id: actionId } });
  revalidateActions();
}
