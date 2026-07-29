import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { buildClientsCsv, buildTasksCsv, buildDocumentsCsv } from "@/lib/exports";
import { createZip } from "@/lib/zip";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";

// Export groupé "en un clic" (bouton sur /admin/exports) — les 3 CSV
// existants (clients, tâches, documents), zippés ensemble plutôt que 3
// téléchargements séparés. Écriture ZIP maison (src/lib/zip.ts, méthode
// "stored") plutôt qu'une dépendance dédiée, pour quelques fichiers texte.
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const [clientsCsv, tasksCsv, documentsCsv] = await Promise.all([
    buildClientsCsv(),
    buildTasksCsv(),
    buildDocumentsCsv(),
  ]);

  const zip = createZip([
    { name: "clients.csv", content: clientsCsv },
    { name: "taches.csv", content: tasksCsv },
    { name: "documents.csv", content: documentsCsv },
  ]);

  const dateStamp = new Date().toISOString().slice(0, 10);

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "data_export",
    targetType: "Export",
    targetLabel: `mikko-visuel-export-${dateStamp}.zip`,
    ipAddress: await getClientIp(),
  });

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="mikko-visuel-export-${dateStamp}.zip"`,
    },
  });
}
