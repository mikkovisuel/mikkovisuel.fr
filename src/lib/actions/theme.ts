"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";

const THEME_COOKIE = "theme";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// « system » (2026-10-20, choix « Selon l'appareil » de l'écran Mon
// affichage) : pas de cookie, le script de démarrage suit alors le réglage
// de l'appareil.
export async function setThemeCookie(theme: "light" | "dark" | "system") {
  const cookieStore = await cookies();
  if (theme === "system") {
    cookieStore.delete(THEME_COOKIE);
    return;
  }
  cookieStore.set(THEME_COOKIE, theme, { path: "/", maxAge: ONE_YEAR_SECONDS });
}

// Called from the client-side theme toggle. Persists to the account (so the
// preference follows the user across devices) in addition to the cookie
// used for no-flash rendering.
export async function updateThemePreference(theme: "light" | "dark") {
  await setThemeCookie(theme);

  const session = await readSession();
  if (!session) return;

  if (session.subjectType === "ADMIN") {
    await db.admin.update({ where: { id: session.subjectId }, data: { themePreference: theme } });
  } else {
    await db.clientContact.update({
      where: { id: session.subjectId },
      data: { themePreference: theme },
    });
  }
}
