"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession, verifyClientSession } from "@/lib/dal";
import { CommentSchema, type CommentFormState } from "@/lib/validation/comment";

function revalidateCommentPaths(taskId: string) {
  revalidatePath(`/admin/taches/${taskId}`);
  revalidatePath(`/espace-client/taches/${taskId}`);
}

export async function postAdminComment(
  taskId: string,
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const admin = await verifyAdminSession();

  const parsed = CommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await db.taskComment.create({
    data: {
      taskId,
      authorType: "ADMIN",
      authorId: admin.id,
      authorName: "Mikko",
      body: parsed.data.body,
    },
  });

  revalidateCommentPaths(taskId);
  return undefined;
}

export async function postClientComment(
  taskId: string,
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const clientUser = await verifyClientSession();

  const parsed = CommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.clientId !== clientUser.clientId) {
    return { error: "Tâche introuvable." };
  }

  await db.taskComment.create({
    data: {
      taskId,
      authorType: "CLIENT_USER",
      authorId: clientUser.id,
      authorName: clientUser.name,
      body: parsed.data.body,
    },
  });

  revalidateCommentPaths(taskId);
  return undefined;
}
