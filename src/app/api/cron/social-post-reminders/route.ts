import { NextResponse } from "next/server";
import { denyUnauthorizedCron } from "@/lib/cron-auth";
import { sendDueSocialPostReminders } from "@/lib/social-post-reminders";
import { runDueRoutines } from "@/lib/social-routine-runner";

// Planifié dans cron.json **toutes les heures** (contrairement aux autres
// rappels, quotidiens) : une publication se prévoit à l'heure près. Même
// protection CRON_SECRET que les autres routes /api/cron/*. Traite aussi les
// routines de programmation (pas de tâche dédiée : limite Scalingo).
export async function GET(request: Request) {
  const denied = denyUnauthorizedCron(request);
  if (denied) return denied;

  const result = await sendDueSocialPostReminders();
  const routines = await runDueRoutines();
  return NextResponse.json({ ...result, ...routines });
}
