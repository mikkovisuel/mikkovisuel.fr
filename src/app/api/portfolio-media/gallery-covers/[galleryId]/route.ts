import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Public route — miroir exact de /api/portfolio-media/covers/[pillarId]
// (couverture de pilier), pour la couverture facultative d'une galerie
// (ajoutée le 2026-08-17). Le portfolio est "accessible librement, sans
// identifiant" (cahier des charges §3) : pas de vérification de session ici,
// intentionnel.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const { galleryId } = await params;

  const gallery = await db.portfolioGallery.findUnique({ where: { id: galleryId } });
  if (!gallery || !gallery.coverStorageKey || !gallery.coverMimeType) {
    return new NextResponse(null, { status: 404 });
  }

  const storage = getStorageAdapter();
  const buffer = await storage.read(gallery.coverStorageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": gallery.coverMimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
