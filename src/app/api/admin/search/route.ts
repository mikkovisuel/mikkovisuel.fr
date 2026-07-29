import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/dal";
import { searchAll } from "@/lib/global-search";

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchAll(query);
  return NextResponse.json(results);
}
