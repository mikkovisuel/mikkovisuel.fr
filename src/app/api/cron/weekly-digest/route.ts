import { NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/lib/weekly-digest";

// Planifié dans cron.json, chaque lundi matin — même protection CRON_SECRET
// que les autres routes /api/cron/* (voir note-reminders/route.ts).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }

  const result = await sendWeeklyDigest();
  return NextResponse.json(result);
}
