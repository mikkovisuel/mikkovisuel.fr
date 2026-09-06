import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { MonthlyTasksInvoiceDocument } from "@/components/pdf/monthly-tasks-invoice-document";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";

const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// Récapitulatif mensuel des tâches terminées, PDF téléchargé à la demande
// (rien n'est enregistré côté app — demande explicite du 2026-09-02, "juste
// téléchargé, rien enregistré") — pensé comme pièce jointe à joindre à la
// facture faite ailleurs. Une tâche compte pour le mois de sa date
// d'évènement (`eventDate`), pas de sa date de création ni de son échéance —
// "ce que j'ai réalisé ce mois-là". Les tâches archivées restent incluses
// (même raisonnement que Finances/Exports : l'archivage d'un client ou
// d'une tâche ne doit pas réécrire l'historique facturable).
export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const annee = Number.parseInt(url.searchParams.get("annee") ?? "", 10);
  const mois = Number.parseInt(url.searchParams.get("mois") ?? "", 10);

  if (!clientId || !Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12) {
    return new NextResponse("Client, année et mois sont requis.", { status: 400 });
  }

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return new NextResponse(null, { status: 404 });
  }

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
  // `eventDate` est filtré `not null` de fait par la plage `gte`/`lt`
  // ci-dessus (Prisma exclut les `null` d'une comparaison), donc jamais
  // `null` ici — évite de propager `Date | null` jusqu'au composant PDF.
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

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "data_export",
    targetType: "Export",
    targetLabel: fileName,
    ipAddress: await getClientIp(),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
