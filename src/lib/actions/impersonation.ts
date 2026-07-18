"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { createSession, destroySession, findSessionByToken, COOKIE_NAME } from "@/lib/session";
import { setThemeCookie } from "@/lib/actions/theme";

const RETURN_TOKEN_COOKIE = "admin_return_token";
const RETURN_CLIENT_COOKIE = "admin_return_client_id";
const PREVIEW_DURATION_MS = 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: PREVIEW_DURATION_MS / 1000,
};

// Lets the admin see exactly what a given client login sees, by briefly
// swapping the session cookie for a real (short-lived) client session —
// reuses every espace-client page as-is rather than rebuilding a read-only
// copy. Deliberately skips lastLoginAt/ClientLoginEvent so this doesn't
// pollute the "journal de connexion" dashboard panel, which tracks real
// client logins only.
export async function impersonateClient(clientUserId: string) {
  await verifyAdminSession();

  const clientUser = await db.clientUser.findUnique({ where: { id: clientUserId } });
  if (!clientUser) return;

  const cookieStore = await cookies();
  const adminToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!adminToken) return;

  cookieStore.set(RETURN_TOKEN_COOKIE, adminToken, cookieOptions);
  cookieStore.set(RETURN_CLIENT_COOKIE, clientUser.clientId, cookieOptions);

  await createSession("CLIENT_USER", clientUser.id, PREVIEW_DURATION_MS);
  await setThemeCookie(clientUser.themePreference === "dark" ? "dark" : "light");
  redirect("/espace-client");
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(RETURN_TOKEN_COOKIE)?.value;
  const clientId = cookieStore.get(RETURN_CLIENT_COOKIE)?.value;

  cookieStore.delete(RETURN_TOKEN_COOKIE);
  cookieStore.delete(RETURN_CLIENT_COOKIE);

  if (!adminToken) {
    redirect("/admin/connexion");
  }

  // Looked up before destroySession() wipes the (impersonated) client
  // session — restores the admin's own theme, which the client's theme
  // preference silently overrode for the duration of the preview.
  const adminSession = await findSessionByToken(adminToken);

  await destroySession();

  const cookieStoreAfter = await cookies();
  cookieStoreAfter.set(COOKIE_NAME, adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (adminSession) {
    const admin = await db.admin.findUnique({ where: { id: adminSession.subjectId } });
    if (admin) {
      await setThemeCookie(admin.themePreference === "dark" ? "dark" : "light");
    }
  }

  redirect(clientId ? `/admin/clients/${clientId}` : "/admin");
}
