import "server-only";
import { google, gmail_v1 } from "googleapis";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secrets";

// Scopes volontairement restreints : lecture + envoi, jamais
// `gmail.modify` (qui permettrait aussi de supprimer/labelliser des
// messages dans le vrai Gmail de l'admin — inutile pour cette
// fonctionnalité, et un écran de consentement Google plus simple à
// valider en mode Testing).
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

// "Jean Dupont <jean@exemple.com>" → "jean@exemple.com" — pour pré-remplir
// le champ "À" d'une réponse à partir de l'en-tête `From` brut d'un
// message Gmail.
export function extractEmailAddress(headerValue: string): string {
  const match = /<([^>]+)>/.exec(headerValue);
  return (match?.[1] ?? headerValue).trim();
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI ne sont pas configurées.",
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGmailAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    // Force le renvoi d'un refresh_token même si l'admin avait déjà
    // autorisé l'app avant (Google ne le renvoie qu'à la première
    // autorisation, sauf avec ce paramètre).
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });
}

// Échange le code retourné par Google contre les tokens, récupère
// l'adresse Gmail connectée, chiffre le refresh token et le stocke sur
// l'unique compte Admin.
export async function connectGmailAccount(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google n'a pas renvoyé de refresh token (déjà autorisé sans révocation préalable ?).",
    );
  }
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: userinfo } = await oauth2.userinfo.get();
  if (!userinfo.email) {
    throw new Error("Impossible de récupérer l'adresse email du compte Google connecté.");
  }

  const admin = await db.admin.findFirstOrThrow();
  await db.admin.update({
    where: { id: admin.id },
    data: {
      gmailEmail: userinfo.email,
      gmailRefreshTokenEnc: encryptSecret(tokens.refresh_token),
      gmailConnectedAt: new Date(),
    },
  });
}

export async function disconnectGmailAccount() {
  const admin = await db.admin.findFirstOrThrow();
  await db.admin.update({
    where: { id: admin.id },
    data: { gmailEmail: null, gmailRefreshTokenEnc: null, gmailConnectedAt: null },
  });
}

export class GmailNotConnectedError extends Error {
  constructor() {
    super("Gmail n'est pas connecté.");
    this.name = "GmailNotConnectedError";
  }
}

// Client Gmail authentifié pour l'admin courant (single-admin app — pas de
// paramètre adminId). Lève `GmailNotConnectedError` si aucun compte n'a
// encore été connecté, pour que les pages puissent afficher un état vide
// clair plutôt qu'une erreur 500.
async function getGmailClient(): Promise<{ gmail: gmail_v1.Gmail; email: string }> {
  const admin = await db.admin.findFirstOrThrow();
  if (!admin.gmailRefreshTokenEnc || !admin.gmailEmail) {
    throw new GmailNotConnectedError();
  }

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: decryptSecret(admin.gmailRefreshTokenEnc) });

  return { gmail: google.gmail({ version: "v1", auth: client }), email: admin.gmailEmail };
}

export interface EmailThreadSummary {
  id: string;
  snippet: string;
  subject: string;
  lastMessageFrom: string;
  lastMessageDate: Date | null;
  messageCount: number;
}

function headerValue(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// Recherche les fils de discussion Gmail impliquant l'une des adresses
// données (comptes de connexion du client) — `from:`/`to:` couvre les deux
// sens de la conversation. Triés par Gmail par pertinence/récence.
export async function searchThreadsForEmails(emails: string[]): Promise<EmailThreadSummary[]> {
  if (emails.length === 0) return [];
  const { gmail } = await getGmailClient();

  const query = emails.map((email) => `(from:${email} OR to:${email})`).join(" OR ");
  const { data } = await gmail.users.threads.list({ userId: "me", q: query, maxResults: 30 });
  const threads = data.threads ?? [];

  const summaries = await Promise.all(
    threads.map(async (thread) => {
      if (!thread.id) return null;
      const { data: full } = await gmail.users.threads.get({
        userId: "me",
        id: thread.id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      const messages = full.messages ?? [];
      const lastMessage = messages[messages.length - 1];
      const headers = lastMessage?.payload?.headers;
      const dateHeader = headerValue(headers, "Date");

      return {
        id: thread.id,
        snippet: thread.snippet ?? "",
        subject: headerValue(headers, "Subject") || "(sans objet)",
        lastMessageFrom: headerValue(headers, "From"),
        lastMessageDate: dateHeader ? new Date(dateHeader) : null,
        messageCount: messages.length,
      } satisfies EmailThreadSummary;
    }),
  );

  return summaries
    .filter((summary): summary is EmailThreadSummary => summary !== null)
    .sort((a, b) => (b.lastMessageDate?.getTime() ?? 0) - (a.lastMessageDate?.getTime() ?? 0));
}

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  date: Date | null;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  attachments: EmailAttachment[];
  messageIdHeader: string;
  referencesHeader: string;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

// Parcourt récursivement les `parts` MIME (multipart/alternative,
// multipart/mixed, multipart/related s'imbriquent) pour trouver le corps
// texte/HTML et lister les pièces jointes, sans télécharger leur contenu
// (récupéré à la demande via `getAttachment`).
function walkParts(
  part: gmail_v1.Schema$MessagePart | undefined,
  acc: { html: string | null; text: string | null; attachments: EmailAttachment[] },
) {
  if (!part) return;

  const filename = part.filename;
  if (filename && part.body?.attachmentId) {
    acc.attachments.push({
      attachmentId: part.body.attachmentId,
      filename,
      mimeType: part.mimeType ?? "application/octet-stream",
      sizeBytes: part.body.size ?? 0,
    });
    return;
  }

  if (part.mimeType === "text/html" && part.body?.data && !acc.html) {
    acc.html = decodeBase64Url(part.body.data);
  } else if (part.mimeType === "text/plain" && part.body?.data && !acc.text) {
    acc.text = decodeBase64Url(part.body.data);
  }

  for (const child of part.parts ?? []) {
    walkParts(child, acc);
  }
}

export async function getThread(threadId: string): Promise<EmailMessage[]> {
  const { gmail } = await getGmailClient();
  const { data } = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });

  return (data.messages ?? []).map((message) => {
    const acc: { html: string | null; text: string | null; attachments: EmailAttachment[] } = {
      html: null,
      text: null,
      attachments: [],
    };
    walkParts(message.payload, acc);
    const headers = message.payload?.headers;
    const dateHeader = headerValue(headers, "Date");

    return {
      id: message.id ?? "",
      threadId: message.threadId ?? threadId,
      from: headerValue(headers, "From"),
      to: headerValue(headers, "To"),
      date: dateHeader ? new Date(dateHeader) : null,
      subject: headerValue(headers, "Subject") || "(sans objet)",
      bodyHtml: acc.html,
      bodyText: acc.text,
      attachments: acc.attachments,
      messageIdHeader: headerValue(headers, "Message-ID"),
      referencesHeader: headerValue(headers, "References"),
    } satisfies EmailMessage;
  });
}

export async function getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
  const { gmail } = await getGmailClient();
  const { data } = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });
  if (!data.data) throw new Error("Pièce jointe introuvable.");
  return Buffer.from(data.data, "base64url");
}

function encodeHeaderIfNeeded(value: string) {
  // Encodage RFC 2047 pour un sujet contenant des accents — évite un
  // objet illisible côté destinataire si le client mail ne devine pas
  // l'encodage.
  return /^[\x00-\x7F]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

export interface SendMessageInput {
  to: string;
  subject: string;
  bodyHtml: string;
  /** Présent pour une réponse/un transfert dans le même fil Gmail. */
  threadId?: string;
  /** `Message-ID` du message auquel on répond (pour `In-Reply-To`/`References`). */
  inReplyToMessageId?: string;
  referencesHeader?: string;
}

// Construit un message RFC 2822 minimal et l'envoie via l'API Gmail.
// `threadId` + `In-Reply-To`/`References` sont ce qui fait apparaître
// l'envoi correctement rattaché au fil existant dans le vrai Gmail — sans
// ça, Gmail créerait un nouveau fil même avec un sujet identique.
export async function sendMessage(input: SendMessageInput): Promise<void> {
  const { gmail, email } = await getGmailClient();

  const lines = [
    `From: ${email}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeaderIfNeeded(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
  ];
  if (input.inReplyToMessageId) lines.push(`In-Reply-To: ${input.inReplyToMessageId}`);
  if (input.referencesHeader) lines.push(`References: ${input.referencesHeader}`);
  lines.push("", input.bodyHtml);

  const raw = Buffer.from(lines.join("\r\n")).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: input.threadId },
  });
}
