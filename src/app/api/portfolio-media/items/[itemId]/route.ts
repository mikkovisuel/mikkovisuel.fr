import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Public route — see covers/[pillarId]/route.ts for why no auth check.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const item = await db.portfolioMediaItem.findUnique({ where: { id: itemId } });
  if (!item || !item.storageKey || !item.mimeType) {
    return new NextResponse(null, { status: 404 });
  }

  const storage = getStorageAdapter();
  const buffer = await storage.read(item.storageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": item.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
