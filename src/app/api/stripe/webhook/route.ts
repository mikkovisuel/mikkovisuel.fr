import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { sendEmailToAdmins } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { formatAmount } from "@/lib/documents";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return new NextResponse(null, { status: 404 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse(null, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const documentId = session.metadata?.documentId;

    if (documentId) {
      const document = await db.document.findUnique({ where: { id: documentId } });
      // Idempotent: Stripe may redeliver the same event, so only apply once.
      // Montant modifié pendant que le client était sur la page de paiement :
      // on ne marque pas payé un montant différent, on prévient les admins.
      if (document && document.paymentStatus !== "paid" && session.amount_total !== document.amountCents) {
        await sendEmailToAdmins({
          trigger: "payment_mismatch",
          subject: `Paiement Stripe à vérifier — ${document.fileName}`,
          html: `<p>Le client a payé <strong>${escapeHtml(formatAmount(session.amount_total, document.currency) ?? "?")}</strong> pour « ${escapeHtml(document.fileName)} », dont le montant est maintenant <strong>${escapeHtml(formatAmount(document.amountCents, document.currency) ?? "?")}</strong>. La facture reste « impayée » : corrigez-la à la main.</p>`,
        });
      } else if (document && document.paymentStatus !== "paid") {
        await db.document.update({
          where: { id: documentId },
          data: { paymentStatus: "paid", paidAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
