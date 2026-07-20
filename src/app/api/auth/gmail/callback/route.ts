import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/dal";
import { connectGmailAccount } from "@/lib/gmail";

// Point de retour du consentement OAuth Google (voir startGmailConnection
// dans src/lib/actions/gmail-auth.ts). Redirige toujours vers
// /admin/reglages, avec ?gmail=connected ou ?gmail=error pour afficher un
// message — pas de page dédiée, juste un aller-retour.
export async function GET(request: Request) {
  await verifyAdminSession();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/admin/reglages?gmail=error", url.origin));
  }

  try {
    await connectGmailAccount(code);
    return NextResponse.redirect(new URL("/admin/reglages?gmail=connected", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/admin/reglages?gmail=error", url.origin));
  }
}
