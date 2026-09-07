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
import { getAppSettings } from "@/lib/settings";
import { escapeHtml } from "@/lib/html-escape";
import {
  DEFAULT_DOCUMENT_SENT_SUBJECT,
  DEFAULT_DOCUMENT_SENT_BODY,
  DEFAULT_PAYMENT_REMINDER_SUBJECT,
  DEFAULT_PAYMENT_REMINDER_BODY,
  fillEmailTemplate,
  renderInvoiceEmailBody,
} from "@/lib/invoice-email-templates";
import { generateMonthlyRecapPdf } from "@/lib/monthly-recap";
import type { EmailAttachmentInput } from "@/lib/email/service";

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

  const settings = await getAppSettings();
  const amount = formatAmount(document.amountCents, document.currency);
  const montantFragment = amount ? `, ${amount}` : "";

  const subject = fillEmailTemplate(
    settings.paymentReminderEmailSubject ?? DEFAULT_PAYMENT_REMINDER_SUBJECT,
    { fichier: document.fileName },
  );
  const html = renderInvoiceEmailBody(
    settings.paymentReminderEmailBody ?? DEFAULT_PAYMENT_REMINDER_BODY,
    { fichier: escapeHtml(document.fileName), montant: escapeHtml(montantFragment) },
  );

  for (const to of notifiableEmailsFromContacts(document.client.contacts)) {
    await sendEmail({
      trigger: "payment_reminder",
      to,
      cc: settings.invoiceEmailCc || undefined,
      subject,
      html,
    });
  }

  await db.document.update({
    where: { id: documentId },
    data: { lastReminderAt: new Date() },
  });

  revalidatePath("/admin/administratif");
  revalidatePath(`/admin/clients/${document.clientId}`);
}

export type SendDocumentState = { error?: string; success?: boolean } | undefined;

// Envoi manuel d'un document à l'email de facturation du client (distinct
// des comptes de connexion — voir `Client.billingEmail`), en pièce jointe.
// Depuis le 2026-09-08 ("possibilité d'ajouter des pièces jointes... avant
// chaque envoi, il faut une validation"), passe par `SendDocumentDialog`
// (aperçu + choix des pièces jointes) plutôt qu'un clic direct — trois
// sources possibles, toutes facultatives en plus du document lui-même :
//  - `companyDocumentIds` : documents Commercial/Société existants
//    (ex. RIB), lus depuis le stockage comme le document principal ;
//  - `uploadedFiles` : PDF ajoutés depuis l'ordinateur pour cet envoi
//    précis, jamais enregistrés ailleurs dans l'app (choix confirmé) ;
//  - `includeMonthlyRecap` + `recapAnnee`/`recapMois` : récapitulatif
//    mensuel régénéré à la volée (même fonction que le téléchargement
//    manuel, src/lib/monthly-recap.ts) plutôt que de faire voyager le
//    fichier prévisualisé côté client jusqu'ici.
export async function sendDocumentByEmail(
  documentId: string,
  _prev: SendDocumentState,
  formData: FormData,
): Promise<SendDocumentState> {
  await verifyAdminSession();

  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { client: true },
  });
  if (!document || !document.client.billingEmail) {
    return { error: "Aucun email de facturation pour ce client." };
  }

  const settings = await getAppSettings();
  const buffer = await getStorageAdapter().read(document.storageKey);
  const attachments: EmailAttachmentInput[] = [{ filename: document.fileName, content: buffer }];

  const companyDocumentIds = formData
    .getAll("companyDocumentIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  if (companyDocumentIds.length > 0) {
    const companyDocuments = await db.companyDocument.findMany({
      where: { id: { in: companyDocumentIds } },
    });
    for (const companyDocument of companyDocuments) {
      const content = await getStorageAdapter().read(companyDocument.storageKey);
      attachments.push({ filename: companyDocument.fileName, content });
    }
  }

  // `size > 0` : un `<input type="file">` laissé vide soumet quand même une
  // entrée `File` fantôme (nom vide, taille 0) dans `FormData` — filtrée ici
  // plutôt que jointe telle quelle.
  const uploadedFiles = formData
    .getAll("uploadedFiles")
    .filter((value): value is File => value instanceof File && value.size > 0);
  for (const file of uploadedFiles) {
    const content = Buffer.from(await file.arrayBuffer());
    attachments.push({ filename: file.name, content });
  }

  if (formData.get("includeMonthlyRecap") === "on") {
    const recapAnnee = Number.parseInt(String(formData.get("recapAnnee") ?? ""), 10);
    const recapMois = Number.parseInt(String(formData.get("recapMois") ?? ""), 10);
    if (Number.isInteger(recapAnnee) && Number.isInteger(recapMois) && recapMois >= 1 && recapMois <= 12) {
      const recap = await generateMonthlyRecapPdf({
        clientId: document.clientId,
        annee: recapAnnee,
        mois: recapMois,
      });
      if (recap) {
        attachments.push({ filename: recap.fileName, content: recap.buffer });
      }
    }
  }

  const subject = fillEmailTemplate(settings.documentSentEmailSubject ?? DEFAULT_DOCUMENT_SENT_SUBJECT, {
    fichier: document.fileName,
  });
  const html = renderInvoiceEmailBody(settings.documentSentEmailBody ?? DEFAULT_DOCUMENT_SENT_BODY, {
    fichier: escapeHtml(document.fileName),
  });

  await sendEmail({
    trigger: "document_sent",
    to: document.client.billingEmail,
    cc: settings.invoiceEmailCc || undefined,
    subject,
    html,
    attachments,
  });

  await db.document.update({
    where: { id: documentId },
    data: { sentAt: new Date() },
  });

  revalidatePath("/admin/administratif");
  revalidatePath(`/admin/clients/${document.clientId}`);
  return { success: true };
}
