import { NextResponse } from "next/server";
import { denyUnauthorizedCron } from "@/lib/cron-auth";
import { purgeExpiredSessions, purgeStaleLogs } from "@/lib/session-purge";

// Déclenché par le scheduler Scalingo (voir cron.json à la racine) tous les
// jours à 3h — purge les sessions expirées et les journaux devenus inutiles
// (voir src/lib/session-purge.ts).
// Même garde CRON_SECRET que les autres routes /api/cron/*.
export async function GET(request: Request) {
  const denied = denyUnauthorizedCron(request);
  if (denied) return denied;

  const sessions = await purgeExpiredSessions();
  const logs = await purgeStaleLogs();
  return NextResponse.json({ ...sessions, ...logs });
}
