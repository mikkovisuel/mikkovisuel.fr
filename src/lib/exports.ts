import "server-only";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";

// CSV partagés entre les routes d'export individuelles (/api/exports/*) et
// l'export groupé (/api/exports/tout) — même contenu, une seule définition.

export async function buildClientsCsv(): Promise<string> {
  const clients = await db.client.findMany({
    where: EXCLUDE_DEMO_CLIENT,
    include: { _count: { select: { contacts: true, tasks: true } } },
    orderBy: { createdAt: "asc" },
  });

  return toCsv([
    ["id", "nom", "notes", "nombre_comptes", "nombre_taches", "cree_le"],
    ...clients.map((client) => [
      client.id,
      client.name,
      client.notes,
      client._count.contacts,
      client._count.tasks,
      client.createdAt.toISOString(),
    ]),
  ]);
}

export async function buildTasksCsv(): Promise<string> {
  const tasks = await db.task.findMany({
    include: { client: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  return toCsv([
    ["id", "client", "titre", "statut", "motif_refus", "bat_valide_le", "archivee", "cree_le"],
    ...tasks.map((task) => [
      task.id,
      task.client.name,
      task.title,
      task.status.label,
      task.refusalReason,
      task.batValidatedAt?.toISOString() ?? "",
      task.archivedAt ? "oui" : "non",
      task.createdAt.toISOString(),
    ]),
  ]);
}

export async function buildDocumentsCsv(): Promise<string> {
  const documents = await db.document.findMany({
    include: { client: true, type: true },
    orderBy: { uploadedAt: "asc" },
  });

  return toCsv([
    ["id", "client", "type", "fichier", "montant_centimes", "statut_paiement", "echeance", "envoye_le", "uploade_le"],
    ...documents.map((document) => [
      document.id,
      document.client.name,
      document.type.label,
      document.fileName,
      document.amountCents,
      document.paymentStatus,
      document.dueDate?.toISOString() ?? "",
      document.sentAt?.toISOString() ?? "",
      document.uploadedAt.toISOString(),
    ]),
  ]);
}
