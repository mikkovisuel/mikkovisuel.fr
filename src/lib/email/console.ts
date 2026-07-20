import "server-only";
import type { SendEmailInput } from "@/lib/email/service";

export async function sendWithConsole(input: SendEmailInput) {
  const attachmentsLabel = input.attachments?.length
    ? `\n[pièces jointes: ${input.attachments.map((a) => a.filename).join(", ")}]`
    : "";
  console.log(
    `[email:${input.trigger}] à ${input.to} — ${input.subject}\n${input.html}${attachmentsLabel}`,
  );
}
