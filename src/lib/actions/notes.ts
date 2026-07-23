"use server";

import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";

// Module de notes internes (façon Apple Notes) — admin uniquement, jamais
// exposé côté espace client. Pas de revalidatePath ici : la page /admin/notes
// est une petite SPA qui possède déjà tout son état côté client (dossiers,
// notes, note sélectionnée), donc chaque action renvoie directement la
// donnée à jour plutôt que de déclencher un refresh de route qui casserait
// la frappe en cours dans l'éditeur.

export async function createFolder(name: string) {
  await verifyAdminSession();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom du dossier est requis.");

  const last = await db.noteFolder.findFirst({ orderBy: { sortOrder: "desc" } });
  return db.noteFolder.create({
    data: { name: trimmed, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
}

export async function renameFolder(folderId: string, name: string) {
  await verifyAdminSession();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom du dossier est requis.");
  return db.noteFolder.update({ where: { id: folderId }, data: { name: trimmed } });
}

export async function deleteFolder(folderId: string) {
  await verifyAdminSession();
  // Les notes du dossier ne sont pas supprimées, elles repassent simplement
  // "sans dossier" (onDelete: SetNull sur Note.folderId).
  await db.noteFolder.delete({ where: { id: folderId } });
}

export async function createNote(input: { folderId?: string | null; clientId?: string | null }) {
  await verifyAdminSession();
  return db.note.create({
    data: { folderId: input.folderId ?? null, clientId: input.clientId ?? null },
  });
}

export async function updateNote(
  noteId: string,
  data: Partial<{
    title: string;
    content: string;
    pinned: boolean;
    folderId: string | null;
    clientId: string | null;
  }>,
) {
  await verifyAdminSession();
  return db.note.update({ where: { id: noteId }, data });
}

export async function deleteNote(noteId: string) {
  await verifyAdminSession();
  await db.note.delete({ where: { id: noteId } });
}
