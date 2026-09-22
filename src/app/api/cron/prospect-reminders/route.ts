import { NextResponse } from "next/server";
import { denyUnauthorizedCron } from "@/lib/cron-auth";
import { sendDueProspectReminders } from "@/lib/prospect-reminders";

// Planifié dans cron.json, une fois par jour — envoie un email récapitulatif
// des relances de prospection arrivées à échéance. Même protection
// CRON_SECRET que /api/cron/purge-deliverables (voir ce fichier pour le
// détail).
export async function GET(request: Request) {
  const denied = denyUnauthorizedCron(request);
  if (denied) return denied;

  const result = await sendDueProspectReminders();
  return NextResponse.json(result);
}
