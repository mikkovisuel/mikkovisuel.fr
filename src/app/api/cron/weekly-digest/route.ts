import { NextResponse } from "next/server";
import { denyUnauthorizedCron } from "@/lib/cron-auth";
import { sendWeeklyDigest } from "@/lib/weekly-digest";

// Planifié dans cron.json, chaque lundi matin — même protection CRON_SECRET
// que les autres routes /api/cron/* (voir note-reminders/route.ts).
export async function GET(request: Request) {
  const denied = denyUnauthorizedCron(request);
  if (denied) return denied;

  const result = await sendWeeklyDigest();
  return NextResponse.json(result);
}
