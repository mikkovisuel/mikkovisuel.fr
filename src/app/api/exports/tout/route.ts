import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { createBackupStream } from "@/lib/backup";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";

// Sauvegarde complète (bouton sur /admin/exports) : les 3 CSV de métadonnées
// **et** tous les fichiers réels — documents, livrables, pièces jointes,
// avatars, médias du portfolio.
//
// Jusqu'au 2026-07-30 cette route ne renvoyait que les CSV : l'archive
// décrivait des fichiers qu'elle ne contenait pas, ce qui rendait fausse la
// promesse de réversibilité faite au client. Voir src/lib/backup.ts.
//
// Réponse en flux (`ReadableStream`) et non en `Buffer` : un seul livrable
// peut peser 500 Mo, tout charger en mémoire ferait tomber le conteneur.
// `maxDuration` est relevé en conséquence — l'archive peut être longue à
// produire sur un gros volume.
export const maxDuration = 300;

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const dateStamp = new Date().toISOString().slice(0, 10);

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "data_export",
    targetType: "Export",
    targetLabel: `mikko-visuel-sauvegarde-${dateStamp}.zip`,
    ipAddress: await getClientIp(),
  });

  const stream = await createBackupStream();

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="mikko-visuel-sauvegarde-${dateStamp}.zip"`,
      // Pas de `Content-Length` : la taille finale n'est pas connue à l'avance
      // puisque l'archive est produite au fil de l'eau.
      "Cache-Control": "no-store",
    },
  });
}
