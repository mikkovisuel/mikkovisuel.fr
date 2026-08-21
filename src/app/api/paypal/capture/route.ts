import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientSession } from "@/lib/dal";
import { capturePaypalOrder } from "@/lib/paypal";

// Retour du paiement PayPal (`return_url` passé à `createPaypalOrder`) — PayPal
// ajoute automatiquement `?token=<orderId>` à cette URL une fois le payeur
// revenu du site PayPal après approbation. Capture effective ici, pas de
// webhook séparé (contrairement à Stripe) : plus simple à configurer côté
// PayPal (aucune URL de webhook à déclarer dans leur tableau de bord), au
// prix de ne pas confirmer un paiement si le client ferme l'onglet avant
// d'être redirigé — cas limite documenté dans VALIDATION.md.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("token");
  const documentId = url.searchParams.get("documentId");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!orderId || !documentId) {
    return NextResponse.redirect(`${siteUrl}/espace-client/administratif?paiement=annule`);
  }

  const clientUser = await getClientSession();
  const document = await db.document.findUnique({ where: { id: documentId } });

  if (
    !document ||
    !clientUser ||
    document.clientId !== clientUser.clientId ||
    document.paypalOrderId !== orderId
  ) {
    return NextResponse.redirect(`${siteUrl}/espace-client/administratif?paiement=annule`);
  }

  // Idempotent : un retour rejoué (double navigation, actualisation de page)
  // ne doit pas re-déclencher une capture déjà effectuée.
  if (document.paymentStatus !== "paid") {
    const completed = await capturePaypalOrder(orderId);
    if (completed) {
      await db.document.update({
        where: { id: document.id },
        data: { paymentStatus: "paid", paidAt: new Date() },
      });
    } else {
      return NextResponse.redirect(`${siteUrl}/espace-client/administratif?paiement=annule`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/espace-client/administratif?paiement=succes`);
}
