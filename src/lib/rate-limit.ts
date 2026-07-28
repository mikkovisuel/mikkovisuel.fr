import "server-only";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;
// Un même réseau (bureau, wifi partagé...) peut légitimement héberger
// plusieurs comptes échouant leur connexion — seuil plus large que par
// email pour ne pas bloquer un réseau entier sur une simple faute de
// frappe partagée, tout en freinant une attaque distribuée sur plusieurs
// comptes depuis une même IP (jusqu'ici totalement libre : voir audit
// sécurité du 2026-07-28, `LoginAttempt.ipAddress` n'était jamais lu).
const MAX_FAILED_ATTEMPTS_PER_IP = 20;

export async function recordLoginAttempt(
  identifier: string,
  succeeded: boolean,
  ipAddress?: string | null,
) {
  await db.loginAttempt.create({
    data: { identifier: identifier.toLowerCase(), succeeded, ipAddress: ipAddress || null },
  });
}

export async function isRateLimited(identifier: string, ipAddress?: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byIdentifier, byIp] = await Promise.all([
    db.loginAttempt.count({
      where: { identifier: identifier.toLowerCase(), succeeded: false, createdAt: { gte: since } },
    }),
    ipAddress
      ? db.loginAttempt.count({
          where: { ipAddress, succeeded: false, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);
  return byIdentifier >= MAX_FAILED_ATTEMPTS || byIp >= MAX_FAILED_ATTEMPTS_PER_IP;
}

// Limite la fréquence des demandes de réinitialisation de mot de passe
// (formulaire public "mot de passe oublié") — indépendant du rate limit de
// connexion ci-dessus. Enregistré pour toute adresse soumise, que le compte
// existe ou non, pour empêcher le spam d'emails vers une victime dont le
// compte n'existe pas forcément.
const RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_RESET_REQUESTS = 3;

export async function recordPasswordResetRequest(identifier: string) {
  await db.passwordResetAttempt.create({ data: { identifier: identifier.toLowerCase() } });
}

export async function isPasswordResetRateLimited(identifier: string): Promise<boolean> {
  const since = new Date(Date.now() - RESET_REQUEST_WINDOW_MS);
  const count = await db.passwordResetAttempt.count({
    where: { identifier: identifier.toLowerCase(), createdAt: { gte: since } },
  });
  return count >= MAX_RESET_REQUESTS;
}
