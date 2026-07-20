"use server";

import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/dal";
import { sendMessage } from "@/lib/gmail";
import { GmailMessageSchema, type GmailMessageFormState } from "@/lib/validation/gmail-message";

// Convertit le texte brut du composeur (un simple <textarea>, comme le
// reste du projet — voir task-comment-thread.tsx) en un minimum de HTML
// pour l'envoi, les emails HTML ignorant les retours à la ligne bruts.
function textToHtml(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("<br>");
}

function quoteBlock(originalHtml: string | null, originalText: string | null, from: string, date: Date | null) {
  const dateLabel = date ? date.toLocaleString("fr-FR") : "";
  const header = `Le ${dateLabel}, ${from} a écrit :`;
  const content = originalHtml ?? (originalText ? textToHtml(originalText) : "");
  return `<blockquote style="margin:16px 0 0;padding-left:12px;border-left:2px solid #ccc;color:#666">
    <p style="font-size:12px;color:#999">${header}</p>
    ${content}
  </blockquote>`;
}

export async function sendReply(
  clientId: string,
  threadId: string,
  replyTo: { to: string; subject: string; messageIdHeader: string; referencesHeader: string },
  originalBody: { html: string | null; text: string | null; from: string; date: Date | null },
  _prev: GmailMessageFormState,
  formData: FormData,
): Promise<GmailMessageFormState> {
  await verifyAdminSession();

  const parsed = GmailMessageSchema.pick({ body: true }).safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const subject = replyTo.subject.toLowerCase().startsWith("re:")
    ? replyTo.subject
    : `Re: ${replyTo.subject}`;

  await sendMessage({
    to: replyTo.to,
    subject,
    bodyHtml:
      textToHtml(parsed.data.body) +
      quoteBlock(originalBody.html, originalBody.text, originalBody.from, originalBody.date),
    threadId,
    inReplyToMessageId: replyTo.messageIdHeader || undefined,
    referencesHeader:
      [replyTo.referencesHeader, replyTo.messageIdHeader].filter(Boolean).join(" ") || undefined,
  });

  revalidatePath(`/admin/clients/${clientId}/emails/${threadId}`);
  return { success: true };
}

export async function forwardMessage(
  clientId: string,
  subject: string,
  originalBody: { html: string | null; text: string | null; from: string; date: Date | null },
  _prev: GmailMessageFormState,
  formData: FormData,
): Promise<GmailMessageFormState> {
  await verifyAdminSession();

  const parsed = GmailMessageSchema.pick({ to: true, body: true }).safeParse({
    to: formData.get("to"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const fwdSubject = subject.toLowerCase().startsWith("fwd:") ? subject : `Fwd: ${subject}`;

  await sendMessage({
    to: parsed.data.to,
    subject: fwdSubject,
    bodyHtml:
      textToHtml(parsed.data.body) +
      quoteBlock(originalBody.html, originalBody.text, originalBody.from, originalBody.date),
  });

  revalidatePath(`/admin/clients/${clientId}/emails`);
  return { success: true };
}

export async function sendNewMessage(
  clientId: string,
  _prev: GmailMessageFormState,
  formData: FormData,
): Promise<GmailMessageFormState> {
  await verifyAdminSession();

  const parsed = GmailMessageSchema.safeParse({
    to: formData.get("to"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await sendMessage({
    to: parsed.data.to,
    subject: parsed.data.subject,
    bodyHtml: textToHtml(parsed.data.body),
  });

  revalidatePath(`/admin/clients/${clientId}/emails`);
  return { success: true };
}
