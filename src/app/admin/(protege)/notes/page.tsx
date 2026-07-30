import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { NotesApp } from "@/components/admin/notes-app";
import { ACTIVE_CLIENTS } from "@/lib/clients";

export const metadata: Metadata = {
  title: "Notes — Admin Mikko Visuel",
};

export default async function AdminNotesPage() {
  await verifyAdminSession();

  const [folders, notes, clients] = await Promise.all([
    db.noteFolder.findMany({ orderBy: { sortOrder: "asc" } }),
    db.note.findMany({ orderBy: { updatedAt: "desc" } }),
    db.client.findMany({ where: ACTIVE_CLIENTS, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Notes</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Bloc-notes interne — jamais visible depuis l&apos;espace client.
      </p>
      <div className="mt-6">
        <NotesApp
          initialFolders={folders.map((f) => ({ id: f.id, name: f.name }))}
          initialNotes={notes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            pinned: n.pinned,
            folderId: n.folderId,
            clientId: n.clientId,
            reminderAt: n.reminderAt ? n.reminderAt.toISOString() : null,
            updatedAt: n.updatedAt.toISOString(),
          }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </div>
  );
}
