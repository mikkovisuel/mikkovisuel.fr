import { NextResponse } from "next/server";
import { getAdminSession, getClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { createThumbnail } from "@/lib/thumbnail";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const attachment = await db.attachment.findUnique({
    where: { id },
    include: { task: true },
  });
  if (!attachment) {
    return new NextResponse(null, { status: 404 });
  }

  const [admin, clientUser] = await Promise.all([getAdminSession(), getClientSession()]);
  const isOwner = clientUser?.clientId === attachment.task.clientId;
  if (!admin && !isOwner) {
    return new NextResponse(null, { status: 403 });
  }

  const storage = getStorageAdapter();
  const buffer = await storage.read(attachment.storageKey);

  // Vignette pour la grille (`FileGrid`, partagée avec les livrables) —
  // voir src/lib/thumbnail.ts.
  const wantsThumbnail =
    new URL(request.url).searchParams.get("thumb") === "1" &&
    attachment.mimeType.startsWith("image/");
  if (wantsThumbnail) {
    const thumbnail = await createThumbnail(buffer);
    return new NextResponse(new Uint8Array(thumbnail), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600" },
    });
  }

  const disposition =
    attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf"
      ? "inline"
      : "attachment";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Content-Length": String(attachment.sizeBytes),
    },
  });
}
