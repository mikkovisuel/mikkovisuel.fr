import "server-only";
import { NextResponse } from "next/server";

// Garde commune aux routes /api/cron/* (factorisée le 2026-09-22 : les six
// routes répétaient le même bloc). Deux réponses distinctes, volontairement :
//   - 503 quand `CRON_SECRET` n'est pas configurée : la route n'est pas
//     appelable, ce n'est pas une erreur d'authentification mais une absence
//     de configuration (même principe que Stripe/Resend ailleurs) ;
//   - 401 quand l'en-tête ne correspond pas.
// Renvoie `null` quand l'appel est légitime.
export function denyUnauthorizedCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }
  return null;
}
