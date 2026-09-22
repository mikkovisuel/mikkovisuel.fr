import { NextResponse } from "next/server";
import { denyUnauthorizedCron } from "@/lib/cron-auth";
import { purgeExpiredDeliverables } from "@/lib/deliverable-purge";

// Déclenché par le scheduler Scalingo (voir cron.json à la racine) tous les
// jours à 3h — purge les livrables finaux expirés (voir
// src/lib/deliverable-purge.ts pour la règle de délai). Protégé par
// CRON_SECRET, porté par cron.json dans l'en-tête Authorization.
export async function GET(request: Request) {
  const denied = denyUnauthorizedCron(request);
  if (denied) return denied;

  const result = await purgeExpiredDeliverables();
  return NextResponse.json(result);
}
