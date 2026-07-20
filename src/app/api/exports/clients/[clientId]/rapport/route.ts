import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TASK_STATUS } from "@/lib/dropdown-lists";
import { TaskReportDocument } from "@/components/pdf/task-report-document";

// Rapport d'état PDF, par client — toutes les tâches non terminées (hors
// archivées), pour que l'admin puisse envoyer un point d'avancement sans
// donner accès à l'espace client complet. Généré à la volée
// (`@react-pdf/renderer`, pas de navigateur headless — trop lourd pour le
// conteneur de production, voir l'incident mémoire du 2026-07-17).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const { clientId } = await params;

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return new NextResponse(null, { status: 404 });
  }

  const tasks = await db.task.findMany({
    where: {
      clientId,
      archivedAt: null,
      status: { slug: { not: TASK_STATUS.TERMINE } },
    },
    include: { status: true, types: true, formats: true },
    orderBy: [{ eventDate: { sort: "asc", nulls: "last" } }],
  });

  // `renderToBuffer` types expect a `Document` element directly — a
  // wrapper component's element type structurally differs even though
  // it renders one, so react-pdf's own docs use this pattern too.
  const documentElement = createElement(TaskReportDocument, {
    clientName: client.name,
    tasks,
    generatedAt: new Date(),
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(documentElement);

  const slug = client.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (é → e) before slugifying
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `rapport-${slug}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
