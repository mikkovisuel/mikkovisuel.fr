import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAdminSession } from "@/lib/dal";
import { ClientGuideDocument } from "@/components/pdf/client-guide-document";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";

// Mode d'emploi de l'espace client, dans la DA du site — voir "Mode
// d'emploi client" sur /admin/reglages. Même approche que le rapport de
// tâches (@react-pdf/renderer, généré à la volée, pas de navigateur
// headless) et même cast pour renderToBuffer (voir ce fichier pour le
// détail du type).
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const documentElement = createElement(ClientGuideDocument, {}) as Parameters<
    typeof renderToBuffer
  >[0];
  const buffer = await renderToBuffer(documentElement);

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "data_export",
    targetType: "Export",
    targetLabel: "guide-espace-client-mikko-visuel.pdf",
    ipAddress: await getClientIp(),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="guide-espace-client-mikko-visuel.pdf"`,
    },
  });
}
