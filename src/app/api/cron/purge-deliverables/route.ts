import { NextResponse } from "next/server";
import { purgeExpiredDeliverables } from "@/lib/deliverable-purge";

// Déclenché par Vercel Cron (voir vercel.json) tous les jours à 3h — purge
// les livrables finaux plus vieux que AppSettings.deliverableRetentionDays.
// Protégé par CRON_SECRET (Vercel ajoute automatiquement ce header aux
// requêtes cron ; en dehors de Vercel, appeler manuellement avec le même
// secret en variable d'environnement).
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
