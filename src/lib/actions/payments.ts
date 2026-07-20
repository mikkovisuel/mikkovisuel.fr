"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession, verifyClientSession, assertNotDemo } from "@/lib/dal";
import { getStripeClient } from "@/lib/stripe";
import { sendEmail } from "@/lib/email/service";
import { formatAmount } from "@/lib/documents";

export async function createCheckoutSession(documentId: string) {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);
  const stripe = getStripeClient();
  if (!stripe) return;

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document || document.clientId !== clientUser.clientId) return;
  if (document.paymentStatus !== "unpaid" || document.amountCents === null) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: document.currency.toLowerCase(),
          product_data: { name: document.fileName },
          unit_amount: document.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/espace-client/administratif?paiement=succes`,
    cancel_url: `${siteUrl}/espace-client/administratif?paiement=annule`,
    metadata: { documentId: document.id },
  });

  await db.document.update({
    where: { id: document.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (session.url) {
    redirect(session.url);
  }
}

// Manual override for payments received outside Stripe (virement, chèque,
// espèces...), or to correct a mistake. Only meaningful for documents with an
// amount attached - "n/a" documents (devis/contrat without a price) aren't
// togglable here.
export async function setDocumentPaymentStatus(documentId: string, status: "paid" | "unpaid") {
  await verifyAdminSession();

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document || document.amountCents === null) return;

  await db.document.update({
    where: { id: documentId },
    data: {
      paymentStatus: status,
      paidAt: status === "paid" ? new Date() : null,
    },
  });

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/clients/${document.clientId}`);
  revalidatePath("/espace-client");
  revalidatePath("/espace-client/administratif");
}

// Manual reminder, since there's no cron/scheduled task infra in this
// project - the admin decides when to nudge a client, rather than an
// automatic recurring job.
export async function sendPaymentReminder(documentId: string) {
  await verifyAdminSession();

  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { client: { include: { users: true } } },
  });
  if (!document || document.paymentStatus !== "unpaid") return;

  const amount = formatAmount(document.amountCents, document.currency);

  for (const user of document.client.users) {
    await sendEmail({
      trigger: "payment_reminder",
      to: user.email,
      subject: `Rappel de paiement — ${document.fileName}`,
      html: `<p>Un document (${document.fileName}${
        amount ? `, ${amount}` : ""
      }) est toujours en attente de paiement dans votre espace client.</p>`,
    });
  }

  await db.document.update({
    where: { id: documentId },
    data: { lastReminderAt: new Date() },
  });

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/clients/${document.clientId}`);
}
