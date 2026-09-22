import { NextResponse } from "next/server";
import { Readable, PassThrough } from "node:stream";
import { ZipArchive } from "archiver";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { slugify } from "@/lib/slugify";
import { logExportDownload } from "@/lib/export-response";

// "Kit de publication" (2026-09-18) : tous les visuels d'une publication en
// un seul zip, numérotés dans l'ordre du carrousel ("01-…", "02-…"), pour
// publier à la main depuis l'application du réseau. Admin uniquement.
// Même garde-fous que la sauvegarde (src/lib/backup.ts) : un fichier absent
// ou illisible est sauté au lieu de figer l'archive.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return new NextResponse(null, { status: 403 });

  const { id } = await params;
  const post = await db.socialPost.findUnique({
    where: { id },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  if (!post) return new NextResponse(null, { status: 404 });
  if (post.media.length === 0) return NextResponse.json({ error: "Aucun visuel." }, { status: 404 });

  const storage = getStorageAdapter();
  // Pas de compression : JPEG, PNG et MP4 le sont déjà.
  const archive = new ZipArchive({ store: true });

  void (async () => {
    for (const [index, media] of post.media.entries()) {
      if (!(await storage.exists(media.storageKey))) continue;
      const source = Readable.fromWeb((await storage.readStream(media.storageKey)) as never);
      const entry = new PassThrough();
      source.on("error", () => entry.end());
      source.pipe(entry);
      archive.append(entry, { name: `${String(index + 1).padStart(2, "0")}-${media.fileName}` });
    }
    await archive.finalize();
  })();

  const slug = slugify(post.title) || "publication";

  const fileName = `visuels-${slug}.zip`;
  // Journalisé comme les autres exports (passe de nettoyage du 2026-09-22) :
  // ce sont des fichiers de client qui sortent de l'application.
  await logExportDownload(admin, fileName);

  return new NextResponse(Readable.toWeb(archive) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
