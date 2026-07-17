import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const clients = await db.client.findMany({
    include: { _count: { select: { users: true, tasks: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = [
    ["id", "nom", "notes", "nombre_comptes", "nombre_taches", "cree_le"],
    ...clients.map((client) => [
      client.id,
      client.name,
      client.notes,
      client._count.users,
      client._count.tasks,
      client.createdAt.toISOString(),
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clients.csv"',
    },
  });
}
