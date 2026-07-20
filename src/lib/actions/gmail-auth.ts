"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/dal";
import { getGmailAuthUrl, disconnectGmailAccount } from "@/lib/gmail";

export async function startGmailConnection() {
  await verifyAdminSession();

  let authUrl: string;
  try {
    authUrl = getGmailAuthUrl();
  } catch {
    // GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI pas encore configurées (guide
    // de configuration pas encore suivi) — repli propre plutôt qu'un
    // crash générique.
    redirect("/admin/reglages?gmail=not-configured");
  }
  redirect(authUrl);
}

export async function disconnectGmail() {
  await verifyAdminSession();
  await disconnectGmailAccount();
  revalidatePath("/admin/reglages");
}
