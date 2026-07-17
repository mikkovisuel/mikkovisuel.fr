import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Public route, same reasoning as /api/portfolio-media/... — the homepage
// Hero is public content, unlike /api/fichiers/... which requires a session.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot } = await params;
  if (slot !== "main" && slot !== "detail") {
    return new NextResponse(null, { status: 404 });
  }

  const hero = await db.homepageHero.findUnique({ where: { id: "hero" } });
  const storageKey = slot === "main" ? hero?.mainStorageKey : hero?.detailStorageKey;
  const mimeType = slot === "main" ? hero?.mainMimeType : hero?.detailMimeType;
  if (!storageKey || !mimeType) {
    return new NextResponse(null, { status: 404 });
  }

  const storage = getStorageAdapter();
  const buffer = await storage.read(storageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
