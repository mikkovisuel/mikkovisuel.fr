import { NextResponse } from "next/server";
import { sendDueProspectReminders } from "@/lib/prospect-reminders";

// Planifié dans cron.json, une fois par jour — envoie un email récapitulatif
// des relances de prospection arrivées à échéance. Même protection
// CRON_SECRET que /api/cron/purge-deliverables (voir ce fichier pour le
// détail).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }

  const result = await sendDueProspectReminders();
  return NextResponse.json(result);
}
