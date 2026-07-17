import "server-only";
import type { SendEmailInput } from "@/lib/email/service";

export async function sendWithConsole(input: SendEmailInput) {
  console.log(
    `[email:${input.trigger}] à ${input.to} — ${input.subject}\n${input.html}`,
  );
}
