import "server-only";
import { Resend } from "resend";
import type { SendEmailInput } from "@/lib/email/service";

const FROM_ADDRESS = "Mikko Visuel <no-reply@mikkovisuel.fr>";

export async function sendWithResend(input: SendEmailInput) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
    })),
  });
}
