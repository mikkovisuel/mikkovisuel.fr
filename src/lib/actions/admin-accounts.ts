"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email/service";
import { requireFreshAdminPassword, type StepUpFormState } from "@/lib/step-up-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";

// Une invitation reste valable 7 jours (2026-10-14) : elle partait avec la
// même heure de validité qu'un « mot de passe oublié », alors qu'un invité
// n'ouvre pas forcément son email dans l'heure — le lien expirait, et
// l'invitation ne pouvait plus être renvoyée (« un compte existe déjà »).
const INVITE_TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const InviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "Email invalide." }),
});

export type InviteAdminState = { error?: string; success?: boolean; resent?: boolean } | undefined;

// Crée un compte admin supplémentaire à accès complet (pas de rôle/
// permission distinct, décision du client 2026-07-29) — mot de passe
// aléatoire jamais communiqué, l'invité le choisit lui-même via le même
// lien "définir votre mot de passe" que le flux de réinitialisation
// existant (`resetPassword` dans password-reset.ts, réutilisé tel quel).
export async function createAdmin(
  _prev: InviteAdminState,
  formData: FormData,
): Promise<InviteAdminState> {
  const currentAdmin = await verifyAdminSession();

  const parsed = InviteAdminSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const existing = await db.admin.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    // Invitation jamais aboutie (lien expiré, email égaré) : on la renvoie
    // plutôt que de bloquer. Un compte réellement activé reste protégé.
    if (await hasActivatedAccount(existing)) {
      return { error: "Un compte admin existe déjà avec cet email." };
    }
    await sendInvitation(existing, currentAdmin);
    revalidatePath("/admin/reglages");
    return { success: true, resent: true };
  }

  const placeholderPasswordHash = await hashPassword(randomBytes(32).toString("hex"));
  const admin = await db.admin.create({
    data: { email: parsed.data.email, passwordHash: placeholderPasswordHash },
  });
  await sendInvitation(admin, currentAdmin);

  revalidatePath("/admin/reglages");
  return { success: true };
}

/** Bouton « Renvoyer l'invitation » de la liste des comptes admin. */
export async function resendAdminInvitation(adminId: string): Promise<InviteAdminState> {
  const currentAdmin = await verifyAdminSession();
  const admin = await db.admin.findUnique({ where: { id: adminId } });
  if (!admin) return { error: "Compte introuvable." };
  if (await hasActivatedAccount(admin)) {
    return { error: "Ce compte est déjà activé : la personne peut utiliser « Mot de passe oublié »." };
  }
  await sendInvitation(admin, currentAdmin);
  revalidatePath("/admin/reglages");
  return { success: true, resent: true };
}

/**
 * Un compte est « activé » dès que son titulaire a choisi un mot de passe
 * (un lien utilisé) ou s'est connecté. Avant cela, le mot de passe est un
 * aléa jamais communiqué : renvoyer l'invitation ne retire rien à personne.
 */
async function hasActivatedAccount(admin: { id: string; lastLoginAt: Date | null }) {
  if (admin.lastLoginAt) return true;
  const used = await db.passwordResetToken.count({
    where: { subjectType: "ADMIN", subjectId: admin.id, usedAt: { not: null } },
  });
  return used > 0;
}

/** Émet un lien neuf (les anciens non utilisés sont retirés) et l'envoie. */
async function sendInvitation(
  admin: { id: string; email: string },
  invitedBy: { id: string; email: string },
) {
  await db.passwordResetToken.deleteMany({
    where: { subjectType: "ADMIN", subjectId: admin.id, usedAt: null },
  });

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: {
      subjectType: "ADMIN",
      subjectId: admin.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_TOKEN_DURATION_MS),
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const inviteUrl = `${siteUrl}/admin/reinitialiser-mot-de-passe/${token}`;

  await sendEmail({
    trigger: "admin_invite",
    to: admin.email,
    subject: "Invitation — accès admin Mikko Visuel",
    html: `<p>Un accès administrateur vient d'être créé pour vous sur Mikko Visuel.</p><p>Cliquez sur ce lien pour choisir votre mot de passe (valable 7 jours) :</p><p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
  });

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: invitedBy.id,
    actorLabel: invitedBy.email,
    action: "admin_invited",
    targetType: "Admin",
    targetId: admin.id,
    targetLabel: admin.email,
    ipAddress: await getClientIp(),
  });
}

// Révoque un compte admin (accès complet supprimé) — protégé par
// reconfirmation du mot de passe admin (comme deleteClient/
// adminResetClientPassword/impersonateClient). Bloque l'auto-révocation :
// un admin ne peut pas se retirer lui-même son propre accès. Les documents
// déjà uploadés par ce compte restent intacts (uploadedByAdminId passe à
// null, voir schema.prisma) ; idem pour les sessions de chrono passées.
export async function revokeAdmin(
  adminId: string,
  _prev: StepUpFormState,
  formData: FormData,
): Promise<StepUpFormState> {
  const currentAdmin = await verifyAdminSession();
  const error = await requireFreshAdminPassword(formData);
  if (error) return { error };

  if (adminId === currentAdmin.id) {
    return { error: "Impossible de révoquer votre propre compte." };
  }

  const target = await db.admin.findUnique({ where: { id: adminId } });
  if (!target) return { error: "Compte introuvable." };

  await db.admin.delete({ where: { id: adminId } });

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: currentAdmin.id,
    actorLabel: currentAdmin.email,
    action: "admin_revoked",
    targetType: "Admin",
    targetId: target.id,
    targetLabel: target.email,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/reglages");
  return { success: true };
}
