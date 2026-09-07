import "server-only";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { MonthlyTasksInvoiceDocument } from "@/components/pdf/monthly-tasks-invoice-document";

const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// Extrait de src/app/api/exports/facturation/route.ts (2026-09-08) pour être
// réutilisable ailleurs qu'en téléchargement direct — notamment en pièce
// jointe d'un envoi de facture (voir sendDocumentByEmail dans
// src/lib/actions/payments.ts), sans dupliquer la requête ni le rendu PDF.
// Même logique que le rapport d'état ci-dessus : une tâche compte pour le
// mois de sa date d'évènement ("ce que j'ai réalisé ce mois-là"), les
// tâches archivées restent incluses (l'archivage ne réécrit pas
// l'historique facturable).
export async function generateMonthlyRecapPdf({
  clientId,
  annee,
  mois,
}: {
  clientId: string;
  annee: number;
  mois: number;
}): Promise<{ buffer: Buffer; fileName: string; clientName: string } | null> {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return null;

  const since = new Date(annee, mois - 1, 1);
  const until = new Date(annee, mois, 1);

  const tasks = await db.task.findMany({
    where: {
      clientId,
      status: { slug: TASK_STATUS.TERMINE },
      eventDate: { gte: since, lt: until },
    },
    orderBy: { eventDate: "asc" },
    select: { id: true, title: true, eventDate: true, types: { select: { label: true } } },
  });

  const monthLabel = `${MONTH_NAMES[mois - 1]} ${annee}`;
  const documentElement = createElement(MonthlyTasksInvoiceDocument, {
    clientName: client.name,
    monthLabel,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      eventDate: task.eventDate as Date,
      types: task.types.map((type) => type.label),
    })),
    generatedAt: new Date(),
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(documentElement);

  const slug = client.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `facturation-${slug}-${annee}-${String(mois).padStart(2, "0")}.pdf`;

  return { buffer, fileName, clientName: client.name };
}
