"use server";

import { revalidatePath } from "next/cache";
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
  await verifyAdminSession();
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

  await db.socialAction.create({
    data: { title: parsed.data.title, description: parsed.data.description || null, dueAt, clientId },
  });
  revalidateActions();
  return { saved: true };
}

export async function updateSocialAction(
  actionId: string,
  _prev: SocialActionFormState,
  formData: FormData,
): Promise<SocialActionFormState> {
  await verifyAdminSession();
  const existing = await db.socialAction.findUnique({ where: { id: actionId }, select: { id: true } });
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

  await db.socialAction.update({
    where: { id: actionId },
    data: { title: parsed.data.title, description: parsed.data.description || null, dueAt, clientId },
  });
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
