"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { isRateLimited, recordLoginAttempt } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { setThemeCookie } from "@/lib/actions/theme";
import { logAuditEvent } from "@/lib/audit-log";
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
  const ipAddress = await getClientIp();

  if (await isRateLimited(email, ipAddress)) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const admin = await db.admin.findUnique({ where: { email } });
  const valid = admin ? await verifyPassword(password, admin.passwordHash) : false;

  await recordLoginAttempt(email, valid, ipAddress);

  if (!admin || !valid) {
    await logAuditEvent({
      actorType: "SYSTEM",
      actorLabel: email,
      action: "admin_login_failed",
      ipAddress,
    });
    return { error: GENERIC_ERROR };
  }

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "admin_login_success",
    ipAddress,
  });

  await createSession("ADMIN", admin.id);
  await setThemeCookie(admin.themePreference === "dark" ? "dark" : "light");
  // `previousLoginAt` becomes the cursor the dashboard's "depuis votre
  // dernière connexion" panel compares against — captured here, before
  // `lastLoginAt` gets overwritten with this session's login time.
  await db.admin.update({
    where: { id: admin.id },
    data: { previousLoginAt: admin.lastLoginAt, lastLoginAt: new Date() },
  });
  redirect("/admin");
}
