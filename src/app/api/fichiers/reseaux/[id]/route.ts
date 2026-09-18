import { NextResponse } from "next/server";
import { getAdminSession, getClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { createThumbnail } from "@/lib/thumbnail";
import { CLIENT_VISIBLE_STATUSES, type SocialPostStatus } from "@/lib/social-posts";

// Visuels et vidéos des publications du module Community management. Même
// structure que /api/fichiers/livrables/[id] : vignette à la volée pour les
// grilles, streaming, et prise en charge des requêtes `Range` — sans elles,
// Safari iOS refuse de lire une vidéo (reels, vérifié sur les livrables le
// 2026-07-17).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const media = await db.socialPostMedia.findUnique({ where: { id }, include: { post: true } });
  if (!media) return new NextResponse(null, { status: 404 });

  const [admin, clientUser] = await Promise.all([getAdminSession(), getClientSession()]);
  // Le client ne voit que ses publications, et jamais les brouillons
  // internes ("Idée", "Rédaction") — même règle que sa page Réseaux sociaux,
  // appliquée ici aussi pour qu'un lien direct ne la contourne pas.
  const isOwner =
    clientUser?.clientId === media.post.clientId &&
    CLIENT_VISIBLE_STATUSES.includes(media.post.status as SocialPostStatus);
  if (!admin && !isOwner) return new NextResponse(null, { status: 403 });

  const storage = getStorageAdapter();

  if (new URL(request.url).searchParams.get("thumb") === "1" && media.mimeType.startsWith("image/")) {
    const thumbnail = await createThumbnail(await storage.read(media.storageKey));
    return new NextResponse(new Uint8Array(thumbnail), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600" },
    });
  }

  const totalSize = media.sizeBytes;
  const disposition = `inline; filename="${encodeURIComponent(media.fileName)}"`;

  const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (rangeMatch) {
    const start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0;
    const end = rangeMatch[2] ? Math.min(parseInt(rangeMatch[2], 10), totalSize - 1) : totalSize - 1;
    if (start >= 0 && start <= end && end < totalSize) {
      const stream = await storage.readStream(media.storageKey, { start, end });
      return new NextResponse(stream, {
        status: 206,
        headers: {
          "Content-Type": media.mimeType,
          "Content-Disposition": disposition,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": String(end - start + 1),
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  const stream = await storage.readStream(media.storageKey);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Disposition": disposition,
      "Content-Length": String(totalSize),
      "Accept-Ranges": "bytes",
    },
  });
}
