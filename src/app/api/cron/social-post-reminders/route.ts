import { NextResponse } from "next/server";
import { denyUnauthorizedCron } from "@/lib/cron-auth";
import { sendDueSocialPostReminders, sendDueSlotReminders } from "@/lib/social-post-reminders";

// Planifié dans cron.json **toutes les heures** (contrairement aux autres
// rappels, quotidiens) : une publication se prévoit à l'heure près. Même
// protection CRON_SECRET que les autres routes /api/cron/*. Traite aussi les
// rappels de créneaux récurrents (pas de tâche dédiée : limite Scalingo).
export async function GET(request: Request) {
  const denied = denyUnauthorizedCron(request);
  if (denied) return denied;

  const result = await sendDueSocialPostReminders();
  const slots = await sendDueSlotReminders();
  return NextResponse.json({ ...result, ...slots });
}
