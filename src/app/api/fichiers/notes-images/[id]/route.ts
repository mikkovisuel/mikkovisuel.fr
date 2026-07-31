import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Images insérées dans les notes internes — admin uniquement, jamais exposé
// côté espace client (le module Notes ne l'est jamais).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return new NextResponse(null, { status: 403 });

  const { id } = await params;
  const image = await db.noteImage.findUnique({ where: { id } });
  if (!image) return new NextResponse(null, { status: 404 });

  const storage = getStorageAdapter();
  const buffer = await storage.read(image.storageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.sizeBytes),
      // Contenu immuable une fois créé (jamais réécrit à la même clé) —
      // mise en cache longue durée légitime, contrairement aux autres
      // routes de fichiers du projet qui peuvent changer (avatar remplacé,
      // document mis à jour).
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
