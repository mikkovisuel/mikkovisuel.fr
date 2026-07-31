"use server";

import { randomUUID } from "node:crypto";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { contentMatchesDeclaredType } from "@/lib/file-signature";

const MAX_NOTE_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_NOTE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Insertion d'image dans une note (ajoutée le 2026-07-31) — voir `NoteImage`
// dans le schéma pour pourquoi ce n'est pas rattaché à une note précise.
// Retourne l'URL de service à insérer directement dans l'éditeur
// (`editor.chain().setImage({ src })`).
export async function uploadNoteImage(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  await verifyAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez une image." };
  }
  if (file.size > MAX_NOTE_IMAGE_SIZE) {
    return { error: "Image trop volumineuse (10 Mo maximum)." };
  }
  if (!ALLOWED_NOTE_IMAGE_TYPES.has(file.type)) {
    return { error: "Format non autorisé (PNG, JPEG, WEBP ou GIF)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!(await contentMatchesDeclaredType(buffer, file.type))) {
    return { error: "Le contenu du fichier ne correspond pas à une image valide." };
  }

  const storage = getStorageAdapter();
  const storageKey = `notes/${randomUUID()}`;
  await storage.save(storageKey, buffer);

  const image = await db.noteImage.create({
    data: {
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      storageBackend: storage.backend,
    },
  });

  return { url: `/api/fichiers/notes-images/${image.id}` };
}

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

export async function createNote(input: {
  folderId?: string | null;
  clientId?: string | null;
  prospectId?: string | null;
}) {
  await verifyAdminSession();
  return db.note.create({
    data: {
      folderId: input.folderId ?? null,
      clientId: input.clientId ?? null,
      prospectId: input.prospectId ?? null,
    },
  });
}

export async function updateNote(
  noteId: string,
  data: Partial<{
    title: string;
    content: string;
    pinned: boolean;
    folderId: string | null;
    // Une note se rattache à un client OU un prospect, jamais les deux
    // (ajouté le 2026-07-31) — voir `NotesApp`, qui n'expose qu'un seul
    // sélecteur d'affectation et efface systématiquement l'autre champ à
    // chaque changement plutôt que de les traiter indépendamment ici.
    clientId: string | null;
    prospectId: string | null;
    // Date seule (pas d'heure), ex. "2026-08-12" — voir NoteEditorHeader.
    reminderAt: string | null;
  }>,
) {
  await verifyAdminSession();
  const { reminderAt, ...rest } = data;
  return db.note.update({
    where: { id: noteId },
    data: {
      ...rest,
      // Toute modification de la date de rappel (y compris la suppression)
      // remet `reminderSentAt` à zéro, pour qu'un rappel décalé après envoi
      // reparte normalement à la nouvelle date plutôt que de rester "déjà
      // envoyé" pour toujours.
      ...(reminderAt !== undefined
        ? { reminderAt: reminderAt ? new Date(reminderAt) : null, reminderSentAt: null }
        : {}),
    },
  });
}

export async function deleteNote(noteId: string) {
  await verifyAdminSession();
  await db.note.delete({ where: { id: noteId } });
}
