"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/dal";
import { getGmailAuthUrl, disconnectGmailAccount, GMAIL_OAUTH_STATE_COOKIE } from "@/lib/gmail";

export async function startGmailConnection() {
  await verifyAdminSession();

  const state = randomBytes(24).toString("base64url");
  let authUrl: string;
  try {
    authUrl = getGmailAuthUrl(state);
  } catch {
    // GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI pas encore configurées (guide
    // de configuration pas encore suivi) — repli propre plutôt qu'un
    // crash générique.
    redirect("/admin/reglages?gmail=not-configured");
  }
  (await cookies()).set(GMAIL_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/gmail",
    maxAge: 10 * 60,
  });
  redirect(authUrl);
}

export async function disconnectGmail() {
  await verifyAdminSession();
  await disconnectGmailAccount();
  revalidatePath("/admin/reglages");
}
