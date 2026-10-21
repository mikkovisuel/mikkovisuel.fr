import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/service";
import { hashResetToken } from "@/lib/password-reset-token";
import type { SubjectType } from "@/lib/session";

// Déplacé hors de `src/lib/actions/password-reset.ts` le 2026-10-20 : dans un
// fichier "use server", toute fonction exportée devient une action appelable
// depuis n'importe quel navigateur. Celle-ci ne vérifie pas de session (ce
// sont ses appelants qui le font) et prend l'adresse en paramètre : exposée,
// elle permettait d'envoyer à une adresse au choix un lien de
// réinitialisation pour le compte d'un client quelconque. Repéré par le test
// automatique `tests/security-actions.test.ts`.

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

// Crée un lien de réinitialisation (1 h, les anciens liens non utilisés sont
// annulés) et l'envoie. Seul endroit où ce lien est fabriqué : formulaire
// « mot de passe oublié » (admin et client), bouton « Réinitialiser » de la
// fiche client et conversion d'un prospect en client.
export async function sendPasswordResetEmail(
  subjectType: SubjectType,
  subjectId: string,
  email: string,
  intro = "Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :",
) {
  await db.passwordResetToken.deleteMany({ where: { subjectType, subjectId, usedAt: null } });

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: {
      subjectType,
      subjectId,
      tokenHash: hashResetToken(token),
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
    html: `<p>${intro}</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

// Lien envoyé par Mikko Visuel à un client (bouton « Réinitialiser », conversion
// d'un prospect). Renvoie `false` sans rien envoyer si le contact n'a pas
// d'email (possible depuis 2026-07-30 : un contact peut n'avoir qu'un
// téléphone). Les appelants doivent traiter ce cas.
export async function sendClientPasswordResetEmail(clientUser: {
  id: string;
  email: string | null;
}): Promise<boolean> {
  if (!clientUser.email) return false;
  await sendPasswordResetEmail(
    "CLIENT_USER",
    clientUser.id,
    clientUser.email,
    "Un lien de réinitialisation de mot de passe a été généré pour vous par Mikko Visuel. Cliquez pour choisir un nouveau mot de passe (valable 1 heure) :",
  );
  return true;
}
