import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/service";
import { hashResetToken } from "@/lib/password-reset-token";

// Déplacé hors de `src/lib/actions/password-reset.ts` le 2026-10-20 : dans un
// fichier "use server", toute fonction exportée devient une action appelable
// depuis n'importe quel navigateur. Celle-ci ne vérifie pas de session (ce
// sont ses appelants qui le font) et prend l'adresse en paramètre : exposée,
// elle permettait d'envoyer à une adresse au choix un lien de
// réinitialisation pour le compte d'un client quelconque. Repéré par le test
// automatique `tests/security-actions.test.ts`.

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

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
      tokenHash: hashResetToken(token),
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
