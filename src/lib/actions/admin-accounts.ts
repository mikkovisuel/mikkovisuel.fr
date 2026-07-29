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

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const InviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "Email invalide." }),
});

export type InviteAdminState = { error?: string; success?: boolean } | undefined;

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
    return { error: "Un compte admin existe déjà avec cet email." };
  }

  const placeholderPasswordHash = await hashPassword(randomBytes(32).toString("hex"));
  const admin = await db.admin.create({
    data: { email: parsed.data.email, passwordHash: placeholderPasswordHash },
  });

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: {
      subjectType: "ADMIN",
      subjectId: admin.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_DURATION_MS),
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const resetUrl = `${siteUrl}/admin/reinitialiser-mot-de-passe/${token}`;

  await sendEmail({
    trigger: "admin_invite",
    to: admin.email,
    subject: "Invitation — accès admin Mikko Visuel",
    html: `<p>Un accès administrateur vient d'être créé pour vous sur Mikko Visuel.</p><p>Cliquez sur ce lien pour choisir votre mot de passe (valable 1 heure) :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: currentAdmin.id,
    actorLabel: currentAdmin.email,
    action: "admin_invited",
    targetType: "Admin",
    targetId: admin.id,
    targetLabel: admin.email,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/reglages");
  return { success: true };
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
