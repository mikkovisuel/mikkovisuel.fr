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
  | "note_reminder";

export interface EmailAttachmentInput {
  filename: string;
  content: Buffer;
}

export interface SendEmailInput {
  trigger: EmailTrigger;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachmentInput[];
}

// Single-admin app: the destination for contact/feedback/BAT-copy emails is
// whichever address the admin account currently uses, not a hardcoded string.
export async function getAdminEmail(): Promise<string | null> {
  const admin = await db.admin.findFirst();
  return admin?.email ?? null;
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
