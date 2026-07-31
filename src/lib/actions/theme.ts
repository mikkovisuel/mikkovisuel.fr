"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";

const THEME_COOKIE = "theme";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setThemeCookie(theme: "light" | "dark") {
  const cookieStore = await cookies();
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
