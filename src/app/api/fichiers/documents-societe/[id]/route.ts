import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Documents Commercial/Société : jamais exposés côté client, admin
// uniquement — contrairement à `/api/fichiers/documents/[id]`, pas besoin
// de vérifier une session client.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return new NextResponse(null, { status: 403 });

  const { id } = await params;
  const document = await db.companyDocument.findUnique({ where: { id } });
  if (!document) return new NextResponse(null, { status: 404 });

  const storage = getStorageAdapter();
  const buffer = await storage.read(document.storageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.fileName)}"`,
      "Content-Length": String(document.sizeBytes),
    },
  });
}
