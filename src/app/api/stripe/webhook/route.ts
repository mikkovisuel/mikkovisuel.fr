import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";

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
      if (document && document.paymentStatus !== "paid") {
        await db.document.update({
          where: { id: documentId },
          data: { paymentStatus: "paid", paidAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
