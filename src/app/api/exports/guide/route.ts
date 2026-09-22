import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAdminSession } from "@/lib/dal";
import { downloadResponse } from "@/lib/export-response";
import { ClientGuideDocument } from "@/components/pdf/client-guide-document";

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

  return downloadResponse({
    admin,
    fileName: "guide-espace-client-mikko-visuel.pdf",
    contentType: "application/pdf",
    body: new Uint8Array(buffer),
  });
}
