"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  GmailNotConnectedError,
  GmailPermissionError,
  createDraft,
  extractEmailAddress,
  getAttachment,
  getThread,
  modifyThreads,
  sendMessage,
  trashThreads,
  type SendMessageInput,
} from "@/lib/gmail";
import { createTaskByAdmin } from "@/lib/actions/tasks";
import { createNote, updateNote } from "@/lib/actions/notes";
import { escapeHtml } from "@/lib/html-escape";

// Onglet Mail (2026-10-21) : boîte Gmail complète dans l'admin. Ranger,
// écrire, répondre, transférer, brouillons, et liens vers clients /
// prospects / tâches / notes.

export type MailFormState = { error?: string; success?: string } | undefined;

const MAX_ATTACHMENTS_BYTES = 20 * 1024 * 1024;
const ThreadIds = z.array(z.string().min(1).max(64)).min(1).max(50);
const OPERATIONS = ["archive", "inbox", "read", "unread", "star", "unstar", "trash", "untrash", "addLabel", "removeLabel"] as const;

function errorMessage(error: unknown) {
  if (error instanceof GmailNotConnectedError || error instanceof GmailPermissionError) return error.message;
  return "Gmail n'a pas répondu, réessayez.";
}

export async function mailModify(
  threadIds: string[],
  operation: (typeof OPERATIONS)[number],
  labelId?: string,
): Promise<{ error?: string }> {
  await verifyAdminSession();
  const ids = ThreadIds.safeParse(threadIds);
  if (!ids.success || !OPERATIONS.includes(operation)) return { error: "Demande invalide." };
  if ((operation === "addLabel" || operation === "removeLabel") && !labelId) return { error: "Libellé manquant." };
  try {
    if (operation === "trash" || operation === "untrash") await trashThreads(ids.data, operation === "untrash");
    else {
      const change = {
        archive: { remove: ["INBOX"] },
        inbox: { add: ["INBOX"] },
        read: { remove: ["UNREAD"] },
        unread: { add: ["UNREAD"] },
        star: { add: ["STARRED"] },
        unstar: { remove: ["STARRED"] },
        addLabel: { add: [labelId!] },
        removeLabel: { remove: [labelId!] },
      }[operation];
      await modifyThreads(ids.data, change);
    }
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/mail", "layout");
  return {};
}

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function quote(message: { bodyHtml: string | null; bodyText: string | null; from: string; date: Date | null }) {
  const header = `Le ${message.date ? message.date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : ""}, ${escapeHtml(message.from)} a écrit :`;
  const content = message.bodyHtml ?? (message.bodyText ? textToHtml(message.bodyText) : "");
  return `<blockquote style="margin:16px 0 0;padding-left:12px;border-left:2px solid #ccc;color:#666"><p style="font-size:12px;color:#999">${header}</p>${content}</blockquote>`;
}

const addressList = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || value.split(",").every((part) => z.email().safeParse(extractEmailAddress(part.trim())).success),
    { message: "Adresse e-mail invalide." },
  );

const MailSchema = z.object({
  mode: z.enum(["new", "reply", "replyAll", "forward"]),
  threadId: z.string().max(64).optional(),
  to: addressList,
  cc: addressList.optional(),
  subject: z.string().trim().max(500).optional(),
  body: z.string().max(100_000),
  intent: z.enum(["send", "draft"]),
});

/** Envoi (ou brouillon) d'un nouveau message, d'une réponse ou d'un transfert. */
export async function submitMail(_prev: MailFormState, formData: FormData): Promise<MailFormState> {
  await verifyAdminSession();
  const parsed = MailSchema.safeParse({
    mode: formData.get("mode"),
    threadId: formData.get("threadId") || undefined,
    to: formData.get("to") ?? "",
    cc: formData.get("cc") ?? "",
    subject: formData.get("subject") ?? "",
    body: formData.get("body") ?? "",
    intent: formData.get("intent") ?? "send",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const data = parsed.data;
  if (data.intent === "send" && !data.to) return { error: "Indiquez un destinataire." };

  const files = formData.getAll("attachments").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_ATTACHMENTS_BYTES) {
    return { error: "Pièces jointes trop lourdes (20 Mo au total)." };
  }
  const attachments = await Promise.all(
    files.map(async (file) => ({ filename: file.name, mimeType: file.type, content: Buffer.from(await file.arrayBuffer()) })),
  );

  try {
    const input: SendMessageInput = { to: data.to, cc: data.cc || undefined, subject: data.subject || "(sans objet)", bodyHtml: textToHtml(data.body), attachments };
    if (data.mode !== "new") {
      if (!data.threadId) return { error: "Conversation introuvable." };
      const messages = await getThread(data.threadId);
      const last = messages[messages.length - 1];
      if (!last) return { error: "Conversation introuvable." };
      input.bodyHtml += quote(last);
      if (data.mode === "forward") {
        input.subject = /^fwd?:/i.test(last.subject) ? last.subject : `Fwd: ${last.subject}`;
        // Transfert : les pièces jointes d'origine suivent.
        for (const file of last.attachments) {
          input.attachments!.push({ filename: file.filename, mimeType: file.mimeType, content: await getAttachment(last.id, file.attachmentId) });
        }
      } else {
        input.subject = /^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`;
        input.threadId = data.threadId;
        input.inReplyToMessageId = last.messageIdHeader || undefined;
        input.referencesHeader = [last.referencesHeader, last.messageIdHeader].filter(Boolean).join(" ") || undefined;
      }
    }
    if (data.intent === "draft") await createDraft(input);
    else await sendMessage(input);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/mail", "layout");
  return { success: data.intent === "draft" ? "Brouillon enregistré dans Gmail." : "Message envoyé." };
}

function plainBody(message: { bodyText: string | null; bodyHtml: string | null }) {
  return (message.bodyText ?? message.bodyHtml?.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, " ") ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Tâche pour un client à partir d'un e-mail (titre = objet, texte = début du message). */
export async function createTaskFromMail(threadId: string, clientId: string): Promise<{ error?: string; href?: string }> {
  const admin = await verifyAdminSession();
  try {
    const messages = await getThread(threadId);
    const last = messages[messages.length - 1];
    if (!last) return { error: "Conversation introuvable." };
    const title = last.subject.slice(0, 200);
    const form = new FormData();
    form.set("title", title);
    form.set("description", `Depuis l'e-mail de ${last.from} :\n\n${plainBody(last).slice(0, 3000)}`);
    const result = await createTaskByAdmin(clientId, undefined, form);
    if (result?.error) return { error: result.error };
    const task = await db.task.findFirst({ where: { clientId, title, createdById: admin.id }, orderBy: { createdAt: "desc" }, select: { id: true } });
    return { href: task ? `/admin/taches/${task.id}` : "/admin/taches" };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

/** Note (rattachée au client ou au prospect) à partir d'un e-mail. */
export async function createNoteFromMail(
  threadId: string,
  link: { clientId?: string; prospectId?: string },
): Promise<{ error?: string; href?: string }> {
  await verifyAdminSession();
  try {
    const messages = await getThread(threadId);
    const last = messages[messages.length - 1];
    if (!last) return { error: "Conversation introuvable." };
    const note = await createNote({ clientId: link.clientId ?? null, prospectId: link.clientId ? null : (link.prospectId ?? null) });
    await updateNote(note.id, {
      title: last.subject.slice(0, 200),
      content: `<p>De ${escapeHtml(last.from)}</p>${plainBody(last)
        .slice(0, 20000)
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join("")}`,
    });
    return { href: "/admin/notes" };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
