"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { isRateLimited, recordLoginAttempt } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { setThemeCookie } from "@/lib/actions/theme";
import { canLogIn } from "@/lib/clients";
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
  const ipAddress = await getClientIp();

  if (await isRateLimited(email, ipAddress)) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const clientUser = await db.clientUser.findUnique({ where: { email } });
  // `canLogIn` couvre les contacts sans accès ouvert et ceux qui n'ont pas
  // encore défini de mot de passe (invitation en attente) — on ne vérifie le
  // mot de passe que si le contact a effectivement le droit d'entrer. Le
  // message d'erreur reste le même message générique dans tous les cas : dire
  // "cet accès est fermé" renseignerait un attaquant sur l'existence du
  // compte.
  const valid =
    clientUser && canLogIn(clientUser)
      ? await verifyPassword(password, clientUser.passwordHash as string)
      : false;

  await recordLoginAttempt(email, valid, ipAddress);

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
