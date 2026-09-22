import "server-only";
import { db } from "@/lib/db";

// Purge des sessions expirées (voir src/lib/session.ts — durée de vie 30
// jours par défaut). Jamais faite jusqu'ici : une session expirée n'était
// supprimée qu'à la prochaine tentative d'utilisation de son cookie
// (verifySession dans dal.ts), donc une session simplement abandonnée
// (déconnexion sans clic, cookie effacé côté client, changement d'appareil)
// restait en base indéfiniment. Table concernée par une lecture à quasi
// chaque requête authentifiée (admin comme espace client) — un ménage
// régulier évite qu'elle ne grossisse sans limite. Signalé le 2026-08-23,
// resté sans suite jusqu'à ce que le client remonte des ralentissements
// (2026-09-08) — appelé par /api/cron/purge-sessions (planifié).
export async function purgeExpiredSessions() {
  const { count } = await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return { purgedCount: count };
}

// Tables qui ne cessaient de grossir, purgées depuis le 2026-09-22 (passe
// de nettoyage) : aucune n'était nettoyée, alors qu'aucune n'a de raison de
// garder l'historique complet.
//   - `EmailLog` : une ligne par email envoyé, **jamais relue par
//     l'application** — utile au diagnostic récent, pas au-delà.
//   - `LoginAttempt` / `PasswordResetAttempt` : la limite d'essais ne
//     regarde qu'une fenêtre de 15 minutes ; 30 jours laissent de la marge
//     pour enquêter après un incident.
//   - `ClientLoginEvent` : alimente le journal de connexions du tableau de
//     bord, qui n'affiche que les plus récentes.
// `AuditLogEntry` n'est volontairement pas purgée : c'est la trace des
// actions sensibles, elle doit rester consultable.
const EMAIL_LOG_RETENTION_DAYS = 90;
const AUTH_ATTEMPT_RETENTION_DAYS = 30;
const CLIENT_LOGIN_RETENTION_DAYS = 365;

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export async function purgeStaleLogs() {
  const [emailLogs, loginAttempts, resetAttempts, clientLogins] = await Promise.all([
    db.emailLog.deleteMany({ where: { sentAt: { lt: daysAgo(EMAIL_LOG_RETENTION_DAYS) } } }),
    db.loginAttempt.deleteMany({ where: { createdAt: { lt: daysAgo(AUTH_ATTEMPT_RETENTION_DAYS) } } }),
    db.passwordResetAttempt.deleteMany({ where: { createdAt: { lt: daysAgo(AUTH_ATTEMPT_RETENTION_DAYS) } } }),
    db.clientLoginEvent.deleteMany({ where: { loggedInAt: { lt: daysAgo(CLIENT_LOGIN_RETENTION_DAYS) } } }),
  ]);

  return {
    emailLogsPurged: emailLogs.count,
    loginAttemptsPurged: loginAttempts.count + resetAttempts.count,
    clientLoginsPurged: clientLogins.count,
  };
}
