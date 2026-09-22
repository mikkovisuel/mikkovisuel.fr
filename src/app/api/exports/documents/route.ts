import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { downloadResponse } from "@/lib/export-response";
import { buildDocumentsCsv } from "@/lib/exports";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  return downloadResponse({
    admin,
    fileName: "documents.csv",
    contentType: "text/csv; charset=utf-8",
    body: await buildDocumentsCsv(),
  });
}
