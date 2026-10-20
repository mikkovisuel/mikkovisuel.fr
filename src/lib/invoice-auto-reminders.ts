import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/service";
import { getAppSettings } from "@/lib/settings";
import { escapeHtml } from "@/lib/html-escape";
import { EXCLUDE_DEMO_CLIENT, notifiableEmailsFromContacts } from "@/lib/clients";
import { DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { formatAmount } from "@/lib/documents";
import {
  DEFAULT_INVOICE_AUTO_REMINDER_BODY,
  DEFAULT_INVOICE_AUTO_REMINDER_SUBJECT,
  fillEmailTemplate,
  renderInvoiceEmailBody,
} from "@/lib/invoice-email-templates";

// Relance automatique des factures impayées (feuille de route, point 4,
// 2026-10-20). Lancée une fois par jour (cron.json, 7 h). Règles :
//  - rien ne part tant que « Relance automatique » n'est pas activée dans
//    Réglages (désactivée par défaut, choix du client) ;
//  - factures seulement (pas les devis ni contrats), impayées, avec une
//    échéance, d'un client ni archivé ni de démonstration ;
//  - 1re relance à partir de J+7 après l'échéance, 2e à partir de J+15, puis
//    plus rien (deux relances au plus par facture) ;
//  - jamais deux relances à moins de 7 jours d'écart, relance manuelle
//    comprise (`lastReminderAt`) : une facture très en retard au moment de
//    l'activation ne reçoit pas ses deux relances coup sur coup.

export const AUTO_REMINDER_STEPS = [7, 15] as const;
const MIN_GAP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

/** Décide si une facture doit être relancée maintenant (fonction pure,
 * testée dans `tests/invoice-auto-reminders.test.ts`). */
export function dueAutoReminder(
  invoice: { dueDate: Date | null; autoReminderCount: number; lastReminderAt: Date | null },
  now: Date,
): number | null {
  if (!invoice.dueDate) return null;
  const step = AUTO_REMINDER_STEPS[invoice.autoReminderCount];
  if (step === undefined) return null;
  const daysLate = Math.floor((now.getTime() - invoice.dueDate.getTime()) / DAY_MS);
  if (daysLate < step) return null;
  if (invoice.lastReminderAt && now.getTime() - invoice.lastReminderAt.getTime() < MIN_GAP_DAYS * DAY_MS) return null;
  return daysLate;
}

export async function sendInvoiceAutoReminders(now = new Date()) {
  const settings = await getAppSettings();
  if (!settings.invoiceAutoReminderEnabled) return { enabled: false, sent: 0 };

  const invoices = await db.document.findMany({
    where: {
      paymentStatus: "unpaid",
      dueDate: { lt: now },
      autoReminderCount: { lt: AUTO_REMINDER_STEPS.length },
      type: { slug: DOCUMENT_TYPE.FACTURE },
      client: { ...EXCLUDE_DEMO_CLIENT, archivedAt: null },
    },
    include: { client: { include: { contacts: { include: { contact: true } } } } },
  });

  let sent = 0;
  for (const invoice of invoices) {
    const daysLate = dueAutoReminder(invoice, now);
    if (daysLate === null) continue;
    const recipients = notifiableEmailsFromContacts(invoice.client.contacts);
    if (recipients.length === 0) continue;

    const amount = formatAmount(invoice.amountCents, invoice.currency);
    const vars = {
      fichier: invoice.fileName,
      montant: amount ? `, ${amount}` : "",
      echeance: DATE.format(invoice.dueDate!),
      jours: String(daysLate),
    };
    const subject = fillEmailTemplate(settings.invoiceAutoReminderSubject ?? DEFAULT_INVOICE_AUTO_REMINDER_SUBJECT, vars);
    const html = renderInvoiceEmailBody(
      settings.invoiceAutoReminderBody ?? DEFAULT_INVOICE_AUTO_REMINDER_BODY,
      Object.fromEntries(Object.entries(vars).map(([key, value]) => [key, escapeHtml(value)])),
    );
    for (const to of recipients) {
      await sendEmail({ trigger: "invoice_auto_reminder", to, cc: settings.invoiceEmailCc || undefined, subject, html });
    }
    await db.document.update({
      where: { id: invoice.id },
      data: { autoReminderCount: { increment: 1 }, lastReminderAt: now },
    });
    sent += 1;
  }
  return { enabled: true, sent };
}
