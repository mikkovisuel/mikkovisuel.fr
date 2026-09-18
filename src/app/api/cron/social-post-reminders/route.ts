import { NextResponse } from "next/server";
import { sendDueSocialPostReminders } from "@/lib/social-post-reminders";

// Planifié dans cron.json **toutes les heures** (contrairement aux autres
// rappels, quotidiens) : une publication se prévoit à l'heure près. Même
// protection CRON_SECRET que les autres routes /api/cron/*.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }

  const result = await sendDueSocialPostReminders();
  return NextResponse.json(result);
}
