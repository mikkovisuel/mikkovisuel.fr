"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { isRateLimited, recordLoginAttempt } from "@/lib/rate-limit";
import { setThemeCookie } from "@/lib/actions/theme";
import { LoginSchema, type LoginFormState } from "@/lib/validation/auth";

const GENERIC_ERROR = "Email ou mot de passe incorrect.";

export async function clientLogin(
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

  const clientUser = await db.clientUser.findUnique({ where: { email } });
  const valid = clientUser ? await verifyPassword(password, clientUser.passwordHash) : false;

  await recordLoginAttempt(email, valid);

  if (!clientUser || !valid) {
    return { error: GENERIC_ERROR };
  }

  await db.clientUser.update({
    where: { id: clientUser.id },
    data: { lastLoginAt: new Date() },
  });
  await db.clientLoginEvent.create({ data: { clientUserId: clientUser.id } });

  await createSession("CLIENT_USER", clientUser.id);
  await setThemeCookie(clientUser.themePreference === "dark" ? "dark" : "light");
  redirect("/espace-client");
}
