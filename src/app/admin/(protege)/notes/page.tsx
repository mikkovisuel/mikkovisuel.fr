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

  const [folders, notes, clients, prospects] = await Promise.all([
    db.noteFolder.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    // `select` explicite (passe de nettoyage du 2026-09-22) : la page ne
    // transmet que ces champs au composant, inutile de rapatrier le reste
    // des colonnes de chaque note.
    db.note.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        pinned: true,
        folderId: true,
        clientId: true,
        prospectId: true,
        reminderAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.client.findMany({ where: ACTIVE_CLIENTS, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // Affectation aux prospects (demande du 2026-07-31) — pas de filtre de
    // statut ici, contrairement à `ACTIVE_CLIENTS` : un prospect "fermé"
    // (converti en client) ou "archivé" garde ses notes rattachées et
    // consultables, l'assignation n'est pas un indicateur de workflow.
    db.prospect.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
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
            prospectId: n.prospectId,
            reminderAt: n.reminderAt ? n.reminderAt.toISOString() : null,
            updatedAt: n.updatedAt.toISOString(),
          }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          prospects={prospects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
}
