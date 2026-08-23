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
//
// D'où l'`ETag` ajouté le 2026-08-23 : il vaut la clé de stockage, qui change
// justement à chaque remplacement. Le navigateur continue de revalider à
// chaque affichage (donc un nouvel avatar apparaît immédiatement, le
// comportement voulu ci-dessus est préservé), mais quand rien n'a bougé on
// répond `304` **sans lire le fichier depuis S3 ni renvoyer le moindre
// octet**. Avant, chaque ligne de `/admin/clients` retéléchargeait l'avatar
// intégralement à chaque affichage de la page.
export async function GET(
  request: Request,
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

  const etag = `"${client.avatarStorageKey}"`;
  const cacheHeaders = {
    "Content-Type": client.avatarMimeType,
    "Cache-Control": "private, max-age=0, must-revalidate",
    ETag: etag,
  };

  // Contrôle d'accès volontairement fait AVANT ce court-circuit : un 304 ne
  // doit pas non plus confirmer l'existence d'un avatar à quelqu'un qui n'y a
  // pas droit.
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: cacheHeaders });
  }

  const body = await getStorageAdapter().readStream(client.avatarStorageKey);
  return new NextResponse(body, { headers: cacheHeaders });
}
