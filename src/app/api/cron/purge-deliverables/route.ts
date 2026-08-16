import { NextResponse } from "next/server";
import { purgeExpiredDeliverables } from "@/lib/deliverable-purge";

// Déclenché par le scheduler Scalingo (voir cron.json à la racine) tous les
// jours à 3h — purge les livrables finaux expirés (voir
// src/lib/deliverable-purge.ts pour la règle de délai). Protégé par
// CRON_SECRET, porté par cron.json dans l'en-tête Authorization.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed : une route publique qui supprime des fichiers ne doit
    // jamais tourner sans secret configuré, même par oubli en production.
    return new NextResponse(null, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }

  const result = await purgeExpiredDeliverables();
  return NextResponse.json(result);
}
