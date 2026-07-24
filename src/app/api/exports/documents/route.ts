import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { buildDocumentsCsv } from "@/lib/exports";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(await buildDocumentsCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="documents.csv"',
    },
  });
}
