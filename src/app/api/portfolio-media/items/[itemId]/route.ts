import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Public route — see covers/[pillarId]/route.ts for why no auth check.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const item = await db.portfolioMediaItem.findUnique({ where: { id: itemId } });
  if (!item || !item.storageKey || !item.mimeType) {
    return new NextResponse(null, { status: 404 });
  }

  const storage = getStorageAdapter();
  const cacheControl = "public, max-age=31536000, immutable";

  // Items uploaded before `sizeBytes` existed on this model: read once (and
  // backfill the column) so this fallback only ever runs once per item.
  let totalSize = item.sizeBytes;
  let fullBuffer: Buffer | null = null;
  if (totalSize == null) {
    fullBuffer = await storage.read(item.storageKey);
    totalSize = fullBuffer.length;
    await db.portfolioMediaItem.update({ where: { id: item.id }, data: { sizeBytes: totalSize } });
  }

  // Mobile Safari (and most mobile browsers) refuse to play a <video> at all
  // if the server doesn't answer its Range request with 206 + Content-Range
  // — without this, uploaded videos silently fail to play on phones.
  const rangeHeader = request.headers.get("range");
  const rangeMatch = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader) : null;
  if (rangeMatch) {
    const start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0;
    const end = rangeMatch[2] ? Math.min(parseInt(rangeMatch[2], 10), totalSize - 1) : totalSize - 1;

    if (start >= 0 && start <= end && end < totalSize) {
      const body = fullBuffer
        ? new Uint8Array(fullBuffer.subarray(start, end + 1))
        : await storage.readStream(item.storageKey, { start, end });
      return new NextResponse(body, {
        status: 206,
        headers: {
          "Content-Type": item.mimeType,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": String(end - start + 1),
          "Accept-Ranges": "bytes",
          "Cache-Control": cacheControl,
        },
      });
    }
  }

  const body = fullBuffer ? new Uint8Array(fullBuffer) : await storage.readStream(item.storageKey);
  return new NextResponse(body, {
    headers: {
      "Content-Type": item.mimeType,
      "Content-Length": String(totalSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": cacheControl,
    },
  });
}
