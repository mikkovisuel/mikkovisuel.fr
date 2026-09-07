import "server-only";
import type { SendEmailInput } from "@/lib/email/service";

export async function sendWithConsole(input: SendEmailInput) {
  const attachmentsLabel = input.attachments?.length
    ? `\n[pièces jointes: ${input.attachments.map((a) => a.filename).join(", ")}]`
    : "";
  const ccLabel = input.cc ? ` (copie : ${input.cc})` : "";
  console.log(
    `[email:${input.trigger}] à ${input.to}${ccLabel} — ${input.subject}\n${input.html}${attachmentsLabel}`,
  );
}
