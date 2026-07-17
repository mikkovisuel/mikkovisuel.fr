"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { isRateLimited, recordLoginAttempt } from "@/lib/rate-limit";
import { setThemeCookie } from "@/lib/actions/theme";
import { LoginSchema, type LoginFormState } from "@/lib/validation/auth";

const GENERIC_ERROR = "Email ou mot de passe incorrect.";

export async function adminLogin(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const { email, password } = parsed.data;

  if (await isRateLimited(email)) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const admin = await db.admin.findUnique({ where: { email } });
  const valid = admin ? await verifyPassword(password, admin.passwordHash) : false;

  await recordLoginAttempt(email, valid);

  if (!admin || !valid) {
    return { error: GENERIC_ERROR };
  }

  await createSession("ADMIN", admin.id);
  await setThemeCookie(admin.themePreference === "dark" ? "dark" : "light");
  redirect("/admin");
}
