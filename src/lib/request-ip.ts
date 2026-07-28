import "server-only";
import { headers } from "next/headers";

// IP du visiteur, pour le rate limiting par IP (voir src/lib/rate-limit.ts).
// Scalingo (comme la plupart des PaaS) termine le TLS et transmet l'IP
// réelle du client via `x-forwarded-for` (peut contenir plusieurs IP
// séparées par des virgules si plusieurs proxys — la première est celle du
// client d'origine). Retourne `null` en local (pas de proxy) plutôt que de
// planter — dans ce cas le rate limit reste actif par identifiant seul.
export async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return headerList.get("x-real-ip");
}
