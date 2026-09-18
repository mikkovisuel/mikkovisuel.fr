import "server-only";
import { db } from "@/lib/db";
import { sendWithResend } from "@/lib/email/resend";
import { sendWithConsole } from "@/lib/email/console";

export type EmailTrigger =
  | "password_reset"
  | "new_document"
  | "document_sent"
  | "deliverables_sent"
  | "new_task_to_validate"
  | "refusal_confirmed"
  | "new_deliverable"
  | "payment_reminder"
  | "task_reminder"
  | "contact_form"
  | "feedback_suggestion"
  | "bat_validated"
  | "note_reminder"
  | "prospect_reminder"
  | "admin_invite"
  | "weekly_digest"
  | "devis_accepted"
  | "server_error"
  | "social_post_to_validate"
  | "social_post_validated"
  | "social_post_refused"
  | "social_post_reminder";

export interface EmailAttachmentInput {
  filename: string;
  content: Buffer;
}

export interface SendEmailInput {
  trigger: EmailTrigger;
  to: string;
  // Copie systématique optionnelle (2026-09-07, réglable dans
  // AppSettings.invoiceEmailCc pour les emails de facturation) — laissé
  // générique ici plutôt que spécifique à un déclencheur, au cas où un
  // autre appelant en ait besoin plus tard.
  cc?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachmentInput[];
}

// Multi-admin (2026-07-29): every admin account has equal access, so
// system notifications (contact form, feedback, reminders...) must reach
// all of them, not just whichever row `findFirst` happens to return.
export async function getAdminEmails(): Promise<string[]> {
  const admins = await db.admin.findMany({ select: { email: true } });
  return admins.map((admin) => admin.email);
}

// Convenience wrapper for the common "one notification, sent to every
// admin" case — sends one email per admin address rather than a single
// multi-recipient email, so each admin's copy is independently logged/
// retried by `sendEmail`.
export async function sendEmailToAdmins(input: Omit<SendEmailInput, "to">): Promise<void> {
  const emails = await getAdminEmails();
  await Promise.all(emails.map((to) => sendEmail({ ...input, to })));
}

// Resend is used when RESEND_API_KEY is set; otherwise emails are logged to
// the console so the app works fully without that account existing yet.
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const send = process.env.RESEND_API_KEY ? sendWithResend : sendWithConsole;

  try {
    await send(input);
    await db.emailLog.create({
      data: { triggerType: input.trigger, recipientEmail: input.to, success: true },
    });
  } catch (error) {
    await db.emailLog.create({
      data: {
        triggerType: input.trigger,
        recipientEmail: input.to,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
