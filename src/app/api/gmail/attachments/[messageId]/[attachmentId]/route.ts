import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { getAttachment } from "@/lib/gmail";

// Téléchargement à la demande d'une pièce jointe Gmail — jamais récupérée
// ni stockée tant que l'admin ne clique pas dessus (voir getThread dans
// src/lib/gmail.ts, qui ne liste que les métadonnées).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const { messageId, attachmentId } = await params;
  const url = new URL(request.url);
  const filename = url.searchParams.get("filename") ?? "piece-jointe";
  const mimeType = url.searchParams.get("mimeType") ?? "application/octet-stream";

  try {
    const buffer = await getAttachment(messageId, attachmentId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
