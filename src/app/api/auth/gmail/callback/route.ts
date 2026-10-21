import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/dal";
import { connectGmailAccount, GMAIL_OAUTH_STATE_COOKIE } from "@/lib/gmail";

// Point de retour du consentement OAuth Google (voir startGmailConnection
// dans src/lib/actions/gmail-auth.ts). Redirige toujours vers
// /admin/reglages, avec ?gmail=connected ou ?gmail=error pour afficher un
// message — pas de page dédiée, juste un aller-retour.
export async function GET(request: Request) {
  await verifyAdminSession();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GMAIL_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete({ name: GMAIL_OAUTH_STATE_COOKIE, path: "/api/auth/gmail" });

  // Retour qui ne vient pas d'une connexion lancée depuis ce navigateur.
  if (error || !code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/admin/reglages?gmail=error", url.origin));
  }

  try {
    await connectGmailAccount(code);
    return NextResponse.redirect(new URL("/admin/reglages?gmail=connected", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/admin/reglages?gmail=error", url.origin));
  }
}
