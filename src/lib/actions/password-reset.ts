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

  let subject: { id: string } | null;
  if (subjectType === "ADMIN") {
    subject = await db.admin.findUnique({ where: { email } });
  } else {
    // Un contact sans accès ouvert à l'espace client (voir
    // `ClientContact.portalAccessEnabled`) n'a pas de mot de passe à
    // réinitialiser : on le traite comme inexistant, ce qui renvoie le
    // message générique habituel sans révéler qu'il figure au carnet
    // d'adresses. Un contact invité mais qui n'a pas encore choisi son mot
    // de passe passe en revanche bien par ici — c'est le chemin normal s'il
    // a perdu son lien d'invitation.
    //
    // Depuis le split Contact/ClientContact (2026-07-31), le même email
    // peut avoir un accès ouvert chez plusieurs clients à la fois (voir
    // client-auth.ts) — cas encore rare. Ce formulaire réinitialise le
    // premier accès ouvert trouvé ; pour cibler un client précis sans
    // ambiguïté, l'admin dispose du bouton "Réinitialiser" par contact sur
    // chaque fiche client (`adminResetClientPassword`, plus bas).
    const contact = await db.contact.findUnique({
      where: { email },
      include: { clientLinks: { where: { portalAccessEnabled: true }, take: 1 } },
    });
    subject = contact?.clientLinks[0] ?? null;
  }

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
    await db.clientContact.update({ where: { id: resetToken.subjectId }, data: { passwordHash } });
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

  // `passwordHash` est nullable depuis que les contacts peuvent exister sans
  // accès (2026-07-30). Ici on est dans une session client valide, donc il y
  // en a forcément un — mais on le teste plutôt que de forcer le type, pour
  // que le jour où un chemin d'accès sans mot de passe apparaîtrait, ça
  // échoue proprement au lieu de planter.
  if (!clientUser.passwordHash) {
    return { error: "Aucun mot de passe défini sur ce compte." };
  }
  const valid = await verifyPassword(parsed.data.currentPassword, clientUser.passwordHash);
  if (!valid) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.clientContact.update({ where: { id: clientUser.id }, data: { passwordHash } });
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
// Renvoie `false` sans rien envoyer si le contact n'a pas d'email (possible
// depuis 2026-07-30 : un contact peut n'avoir qu'un téléphone). Les appelants
// doivent traiter ce cas plutôt que de supposer l'envoi réussi.
export async function sendClientPasswordResetEmail(clientUser: {
  id: string;
  email: string | null;
}): Promise<boolean> {
  if (!clientUser.email) return false;

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

  return true;
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

  const clientUser = await db.clientContact.findUnique({
    where: { id: clientUserId },
    include: { contact: true },
  });
  if (!clientUser) return { error: "Compte introuvable." };

  const sent = await sendClientPasswordResetEmail({ id: clientUser.id, email: clientUser.contact.email });
  if (!sent) {
    return { error: "Ce contact n'a pas d'adresse email — ajoutez-en une d'abord." };
  }
  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "client_password_reset",
    targetType: "ClientUser",
    targetId: clientUser.id,
    targetLabel: clientUser.contact.email ?? clientUser.contact.name,
    ipAddress: await getClientIp(),
  });
  return { success: true };
}
