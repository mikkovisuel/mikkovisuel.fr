import { NextResponse } from "next/server";
import { denyUnauthorizedCron } from "@/lib/cron-auth";
import { sendInvoiceAutoReminders } from "@/lib/invoice-auto-reminders";

// Planifié dans cron.json, une fois par jour (avec les rappels de notes) —
// relance automatique des factures impayées, si elle est activée dans
// Réglages. Même protection CRON_SECRET que les autres tâches planifiées.
export async function GET(request: Request) {
  const denied = denyUnauthorizedCron(request);
  if (denied) return denied;

  const result = await sendInvoiceAutoReminders();
  return NextResponse.json(result);
}
