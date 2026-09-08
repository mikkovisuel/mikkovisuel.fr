import { NextResponse } from "next/server";
import { purgeExpiredSessions } from "@/lib/session-purge";

// Déclenché par le scheduler Scalingo (voir cron.json à la racine) tous les
// jours à 4h — purge les sessions expirées (voir src/lib/session-purge.ts).
// Même garde CRON_SECRET que les autres routes /api/cron/*.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }

  const result = await purgeExpiredSessions();
  return NextResponse.json(result);
}
