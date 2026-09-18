import { NextResponse } from "next/server";
import { sendDueSocialPostReminders, sendDueSlotReminders } from "@/lib/social-post-reminders";

// Planifié dans cron.json **toutes les heures** (contrairement aux autres
// rappels, quotidiens) : une publication se prévoit à l'heure près. Même
// protection CRON_SECRET que les autres routes /api/cron/*. Traite aussi les
// rappels de créneaux récurrents (pas de tâche dédiée : limite Scalingo).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }

  const result = await sendDueSocialPostReminders();
  const slots = await sendDueSlotReminders();
  return NextResponse.json({ ...result, ...slots });
}
