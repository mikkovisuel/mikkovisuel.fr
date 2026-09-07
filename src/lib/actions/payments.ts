"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession, verifyClientSession, assertNotDemo } from "@/lib/dal";
import { getStripeClient } from "@/lib/stripe";
import { createPaypalOrder } from "@/lib/paypal";
import { sendEmail } from "@/lib/email/service";
import { formatAmount } from "@/lib/documents";
import { getStorageAdapter } from "@/lib/storage";
import { notifiableEmailsFromContacts } from "@/lib/clients";

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

// Même rôle que `createCheckoutSession` ci-dessus, pour PayPal — deuxième
// moyen de paiement en ligne (demande du 2026-08-17), Stripe reste
// disponible en parallèle plutôt que remplacé. Capture faite au retour côté
// `/api/paypal/capture`, pas ici : PayPal ne débite qu'après approbation du
// payeur sur son propre site.
export async function createPaypalCheckout(documentId: string) {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document || document.clientId !== clientUser.clientId) return;
  if (document.paymentStatus !== "unpaid" || document.amountCents === null) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const order = await createPaypalOrder({
    amountCents: document.amountCents,
    currency: document.currency,
    description: document.fileName,
    returnUrl: `${siteUrl}/api/paypal/capture?documentId=${document.id}`,
    cancelUrl: `${siteUrl}/espace-client/administratif?paiement=annule`,
  });
  if (!order) return;

  await db.document.update({
    where: { id: document.id },
    data: { paypalOrderId: order.orderId },
  });

  redirect(order.approveUrl);
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

  revalidatePath("/admin/administratif");
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
    include: { client: { include: { contacts: { include: { contact: true } } } } },
  });
  if (!document || document.paymentStatus !== "unpaid") return;

  const amount = formatAmount(document.amountCents, document.currency);

  for (const to of notifiableEmailsFromContacts(document.client.contacts)) {
    await sendEmail({
      trigger: "payment_reminder",
      to,
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

  revalidatePath("/admin/administratif");
  revalidatePath(`/admin/clients/${document.clientId}`);
}

// Envoi manuel d'un document à l'email de facturation du client (distinct
// des comptes de connexion — voir `Client.billingEmail`), en pièce jointe.
// Objet = nom du fichier, corps = message fixe demandé par le client.
export async function sendDocumentByEmail(documentId: string) {
  await verifyAdminSession();

  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { client: true },
  });
  if (!document || !document.client.billingEmail) return;

  const buffer = await getStorageAdapter().read(document.storageKey);

  await sendEmail({
    trigger: "document_sent",
    to: document.client.billingEmail,
    subject: document.fileName,
    html: `<p>Bonjour,</p><p>Ci-joint un nouveau document : "${document.fileName}".</p><p>Je reste à disposition pour tout renseignement complémentaire.</p><p>Par avance, merci.</p>`,
    attachments: [{ filename: document.fileName, content: buffer }],
  });

  await db.document.update({
    where: { id: documentId },
    data: { sentAt: new Date() },
  });

  revalidatePath("/admin/administratif");
  revalidatePath(`/admin/clients/${document.clientId}`);
}
