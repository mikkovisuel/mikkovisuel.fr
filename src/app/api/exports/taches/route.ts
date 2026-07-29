import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { buildTasksCsv } from "@/lib/exports";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "data_export",
    targetType: "Export",
    targetLabel: "taches.csv",
    ipAddress: await getClientIp(),
  });

  return new NextResponse(await buildTasksCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="taches.csv"',
    },
  });
}
