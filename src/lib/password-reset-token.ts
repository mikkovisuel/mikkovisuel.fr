import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

// Lecture de l'état d'un lien « choisir votre mot de passe » (invitation ou
// réinitialisation), pour que la page le dise dès son ouverture au lieu de
// laisser saisir un mot de passe pour rien (signalé le 2026-10-14 : un lien
// d'invitation expiré n'affichait l'erreur qu'après validation du
// formulaire, sans issue proposée).
//
// Hors du fichier d'actions `password-reset.ts` à dessein : tout ce qu'exporte
// un fichier "use server" devient appelable depuis le navigateur.

export type ResetLinkStatus = "valid" | "expired" | "used" | "unknown";

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getResetLinkStatus(token: string): Promise<ResetLinkStatus> {
  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { expiresAt: true, usedAt: true },
  });
  if (!resetToken) return "unknown";
  if (resetToken.usedAt) return "used";
  if (resetToken.expiresAt < new Date()) return "expired";
  return "valid";
}
