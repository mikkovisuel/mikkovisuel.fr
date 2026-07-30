import { NextResponse } from "next/server";
import { getAdminSession, getClientSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

// Contrairement aux médias du portfolio (publics), l'avatar d'un client est
// une donnée client : accessible aux admins, et au client lui-même pour le
// sien. Même garde que `/api/fichiers/documents/[id]`.
//
// Pas de `Cache-Control: immutable` ici : la clé de stockage change à chaque
// remplacement, mais l'URL de cette route reste la même (`/…/[clientId]/
// avatar`), donc un cache long figerait l'ancienne image après changement.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client?.avatarStorageKey || !client.avatarMimeType) {
    return new NextResponse(null, { status: 404 });
  }

  const [admin, clientUser] = await Promise.all([getAdminSession(), getClientSession()]);
  const isOwner = clientUser?.clientId === clientId;
  if (!admin && !isOwner) {
    return new NextResponse(null, { status: 403 });
  }

  const buffer = await getStorageAdapter().read(client.avatarStorageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": client.avatarMimeType,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
