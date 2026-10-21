import "server-only";
import { headers } from "next/headers";

// IP du visiteur, pour le rate limiting par IP (voir src/lib/rate-limit.ts).
// Scalingo (comme la plupart des PaaS) termine le TLS et transmet l'IP
// réelle du client via `x-forwarded-for`. On prend la **dernière** valeur :
// c'est celle ajoutée par le routeur de Scalingo ; les précédentes viennent
// du visiteur, qui peut écrire ce qu'il veut (audit du 2026-10-21). Retourne `null` en local (pas de proxy) plutôt que de
// planter — dans ce cas le rate limit reste actif par identifiant seul.
export async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",").at(-1)?.trim() || null;
  }
  return headerList.get("x-real-ip");
}
