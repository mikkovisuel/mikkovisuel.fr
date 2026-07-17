import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const tasks = await db.task.findMany({
    include: { client: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const rows = [
    ["id", "client", "titre", "statut", "motif_refus", "bat_valide_le", "archivee", "cree_le"],
    ...tasks.map((task) => [
      task.id,
      task.client.name,
      task.title,
      task.status.label,
      task.refusalReason,
      task.batValidatedAt?.toISOString() ?? "",
      task.archivedAt ? "oui" : "non",
      task.createdAt.toISOString(),
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="taches.csv"',
    },
  });
}
