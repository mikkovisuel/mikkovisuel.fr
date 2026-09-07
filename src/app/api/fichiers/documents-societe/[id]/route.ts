import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Documents Commercial/Société : jamais exposés côté client, admin
// uniquement — contrairement à `/api/fichiers/documents/[id]`, pas besoin
// de vérifier une session client.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return new NextResponse(null, { status: 403 });

  const { id } = await params;
  const document = await db.companyDocument.findUnique({ where: { id } });
  if (!document) return new NextResponse(null, { status: 404 });

  // Aperçu (2026-09-08, "valider chaque pièce jointe avec un aperçu" avant
  // d'envoyer une facture) : affichage inline plutôt qu'un téléchargement
  // forcé — comportement par défaut inchangé pour tout appelant existant
  // (CompanyDocumentRow, "Télécharger").
  const preview = new URL(request.url).searchParams.get("preview") === "1";

  // Streamé plutôt que chargé en mémoire (2026-08-23), même raison que
  // `/api/fichiers/documents/[id]` : évite deux copies du fichier en RAM par
  // téléchargement sur un conteneur de 512 Mo.
  const storage = getStorageAdapter();
  const body = await storage.readStream(document.storageKey);

  return new NextResponse(body, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${encodeURIComponent(document.fileName)}"`,
      "Content-Length": String(document.sizeBytes),
    },
  });
}
