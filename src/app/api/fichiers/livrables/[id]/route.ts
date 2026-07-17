import { NextResponse } from "next/server";
import { getAdminSession, getClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const deliverable = await db.deliverable.findUnique({
    where: { id },
    include: { task: true },
  });
  if (!deliverable) {
    return new NextResponse(null, { status: 404 });
  }

  const [admin, clientUser] = await Promise.all([getAdminSession(), getClientSession()]);
  const isOwner = clientUser?.clientId === deliverable.task.clientId;
  if (!admin && !isOwner) {
    return new NextResponse(null, { status: 403 });
  }

  const storage = getStorageAdapter();
  const disposition =
    deliverable.mimeType.startsWith("image/") ||
    deliverable.mimeType.startsWith("video/") ||
    deliverable.mimeType === "application/pdf"
      ? "inline"
      : "attachment";
  const totalSize = deliverable.sizeBytes;

  // Range support is what lets the espace-client lightbox scrub a video
  // instead of downloading the whole (up to 500 Mo) file before playback.
  const rangeHeader = request.headers.get("range");
  const rangeMatch = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader) : null;
  if (rangeMatch) {
    const start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0;
    const end = rangeMatch[2] ? Math.min(parseInt(rangeMatch[2], 10), totalSize - 1) : totalSize - 1;

    if (start >= 0 && start <= end && end < totalSize) {
      const stream = await storage.readStream(deliverable.storageKey, { start, end });
      return new NextResponse(stream, {
        status: 206,
        headers: {
          "Content-Type": deliverable.mimeType,
          "Content-Disposition": `${disposition}; filename="${encodeURIComponent(deliverable.fileName)}"`,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": String(end - start + 1),
          "Accept-Ranges": "bytes",
        },
      });
    }
  }

  const stream = await storage.readStream(deliverable.storageKey);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": deliverable.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(deliverable.fileName)}"`,
      "Content-Length": String(totalSize),
      "Accept-Ranges": "bytes",
    },
  });
}
