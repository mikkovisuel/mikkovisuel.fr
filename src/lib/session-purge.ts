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
