"use server";

import { redirect } from "next/navigation";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  destroyAllSessionsForSubject,
  destroyOtherSessionsForSubject,
  type SubjectType,
} from "@/lib/session";
import { sendEmail } from "@/lib/email/service";
import { verifyClientSession, verifyAdminSession, assertNotDemo } from "@/lib/dal";
import {
  isPasswordResetRateLimited,
  recordPasswordResetRequest,
} from "@/lib/rate-limit";
import { requireFreshAdminPassword, type StepUpFormState } from "@/lib/step-up-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import { ChangePasswordSchema, type ChangePasswordState } from "@/lib/validation/auth";

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;
const GENERIC_MESSAGE =
  "Si ce compte existe, un email avec un lien de réinitialisation vient d'être envoyé.";

const EmailSchema = z.string().trim().toLowerCase().email();

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requestReset(subjectType: SubjectType, rawEmail: string) {
  const parsed = EmailSchema.safeParse(rawEmail);
  if (!parsed.success) return { message: GENERIC_MESSAGE };
  const email = parsed.data;

  // Limité par email, indépendamment du fait que le compte existe ou non —
  // sinon ce formulaire public sert à spammer n'importe quelle boîte mail
  // de rappels "mot de passe oublié" sans limite.
  if (await isPasswordResetRateLimited(email)) {
    return { message: GENERIC_MESSAGE };
  }
  await recordPasswordResetRequest(email);

  const subject =
    subjectType === "ADMIN"
      ? await db.admin.findUnique({ where: { email } })
      : await db.clientUser.findUnique({ where: { email } });

  if (subject) {
    // Invalide les liens de réinitialisation précédents non utilisés :
    // sans ça, demander plusieurs fois laisse plusieurs tokens valides en
    // parallèle jusqu'à leur expiration (1h chacun).
    await db.passwordResetToken.deleteMany({
      where: { subjectType, subjectId: subject.id, usedAt: null },
    });

    const token = randomBytes(32).toString("base64url");
    await db.passwordResetToken.create({
      data: {
        subjectType,
        subjectId: subject.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_DURATION_MS),
      },
    });

    const basePath = subjectType === "ADMIN" ? "/admin" : "/espace-client";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const resetUrl = `${siteUrl}${basePath}/reinitialiser-mot-de-passe/${token}`;

    await sendEmail({
      trigger: "password_reset",
      to: email,
      subject: "Réinitialisation de votre mot de passe — Mikko Visuel",
      html: `<p>Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  return { message: GENERIC_MESSAGE };
}

export type RequestResetState = { message: string } | undefined;

export async function requestAdminPasswordReset(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  return requestReset("ADMIN", String(formData.get("email") ?? ""));
}

export async function requestClientPasswordReset(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  return requestReset("CLIENT_USER", String(formData.get("email") ?? ""));
}

const NewPasswordSchema = z
  .object({
    password: z.string().min(8, { message: "8 caractères minimum." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type ResetPasswordState = { error?: string } | undefined;

export async function resetPassword(
  token: string,
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = NewPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const tokenHash = hashToken(token);
  const resetToken = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "Ce lien de réinitialisation est invalide ou expiré." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const subjectType = resetToken.subjectType as SubjectType;

  if (subjectType === "ADMIN") {
    const admin = await db.admin.update({
      where: { id: resetToken.subjectId },
      data: { passwordHash },
    });
    await logAuditEvent({
      actorType: "ADMIN",
      actorId: admin.id,
      actorLabel: admin.email,
      action: "admin_password_reset_completed",
      ipAddress: await getClientIp(),
    });
  } else {
    await db.clientUser.update({ where: { id: resetToken.subjectId }, data: { passwordHash } });
  }

  await db.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
  await destroyAllSessionsForSubject(subjectType, resetToken.subjectId);

  redirect(subjectType === "ADMIN" ? "/admin/connexion" : "/espace-client/connexion");
}

// Changement de mot de passe depuis l'espace client, en étant déjà connecté
// (contrairement à `resetPassword`, qui part d'un lien email pour un mot de
// passe oublié) — demande le mot de passe actuel plutôt qu'un token.
export async function changeClientPassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, clientUser.passwordHash);
  if (!valid) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.clientUser.update({ where: { id: clientUser.id }, data: { passwordHash } });
  // Révoque les autres sessions actives (autres appareils/navigateurs) sans
  // déconnecter celle en cours — voir destroyOtherSessionsForSubject.
  await destroyOtherSessionsForSubject("CLIENT_USER", clientUser.id);

  return { success: true };
}

// Logique partagée entre le bouton "Réinitialiser" (step-up, ci-dessous) et
// la conversion automatique d'un prospect en client
// (convertProspectToClient dans src/lib/actions/prospects.ts), qui doit
// envoyer le même email sans jamais avoir de mot de passe admin à
// revérifier (c'est déjà une étape interne d'une action elle-même protégée
// par verifyAdminSession).
export async function sendClientPasswordResetEmail(clientUser: { id: string; email: string }) {
  await db.passwordResetToken.deleteMany({
    where: { subjectType: "CLIENT_USER", subjectId: clientUser.id, usedAt: null },
  });

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: {
      subjectType: "CLIENT_USER",
      subjectId: clientUser.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_DURATION_MS),
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const resetUrl = `${siteUrl}/espace-client/reinitialiser-mot-de-passe/${token}`;

  await sendEmail({
    trigger: "password_reset",
    to: clientUser.email,
    subject: "Réinitialisation de votre mot de passe — Mikko Visuel",
    html: `<p>Un lien de réinitialisation de mot de passe a été généré pour vous par Mikko Visuel. Cliquez pour choisir un nouveau mot de passe (valable 1 heure) :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

// Bouton "Réinitialiser" sur la fiche client admin (à côté de chaque compte
// de connexion) : envoie le même email de réinitialisation que le
// formulaire "mot de passe oublié" public, sans passer par la ressaisie de
// l'email — l'admin connaît déjà le compte. Protégé par une reconfirmation
// du mot de passe admin (voir requireFreshAdminPassword).
export async function adminResetClientPassword(
  clientUserId: string,
  _prev: StepUpFormState,
  formData: FormData,
): Promise<StepUpFormState> {
  const admin = await verifyAdminSession();
  const error = await requireFreshAdminPassword(formData);
  if (error) return { error };

  const clientUser = await db.clientUser.findUnique({ where: { id: clientUserId } });
  if (!clientUser) return { error: "Compte introuvable." };

  await sendClientPasswordResetEmail(clientUser);
  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "client_password_reset",
    targetType: "ClientUser",
    targetId: clientUser.id,
    targetLabel: clientUser.email,
    ipAddress: await getClientIp(),
  });
  return { success: true };
}
