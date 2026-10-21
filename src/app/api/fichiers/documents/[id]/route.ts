import { NextResponse } from "next/server";
import { clientOwnsFile } from "@/lib/file-access";
import { getAdminSession, getClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const document = await db.document.findUnique({ where: { id } });
  if (!document) {
    return new NextResponse(null, { status: 404 });
  }

  const [admin, clientUser] = await Promise.all([getAdminSession(), getClientSession()]);
  const isOwner = clientOwnsFile(clientUser, document);
  if (!admin && !isOwner) {
    return new NextResponse(null, { status: 403 });
  }

  // Signature dessinée par le client sur un devis (preuve d'accord), pour l'admin.
  if (new URL(request.url).searchParams.get("signature") === "1") {
    const prefix = "data:image/png;base64,";
    if (!admin || !document.signatureDataUrl?.startsWith(prefix)) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(new Uint8Array(Buffer.from(document.signatureDataUrl.slice(prefix.length), "base64")), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
    });
  }

  // Streamé plutôt que lu en entier (2026-08-23) : `storage.read` chargeait
  // le fichier en mémoire, puis `new Uint8Array(buffer)` en faisait une
  // seconde copie — soit 2× la taille du document par téléchargement, sur un
  // conteneur qui n'a que 512 Mo. Plusieurs téléchargements simultanés
  // suffisaient à faire monter la mémoire pour rien, alors que l'adaptateur
  // de stockage sait déjà streamer (`readStream`, utilisé pour les livrables).
  const storage = getStorageAdapter();
  const body = await storage.readStream(document.storageKey);

  return new NextResponse(body, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.fileName)}"`,
      "Content-Length": String(document.sizeBytes),
    },
  });
}
