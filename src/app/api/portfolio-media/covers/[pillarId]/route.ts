import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Public route — the portfolio is "accessible librement, sans identifiant"
// (cahier des charges §3), unlike /api/fichiers/... which requires a
// session. No auth check here is intentional.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pillarId: string }> },
) {
  const { pillarId } = await params;

  const pillar = await db.portfolioPillar.findUnique({ where: { id: pillarId } });
  if (!pillar || !pillar.coverStorageKey || !pillar.coverMimeType) {
    return new NextResponse(null, { status: 404 });
  }

  const storage = getStorageAdapter();
  const buffer = await storage.read(pillar.coverStorageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": pillar.coverMimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
