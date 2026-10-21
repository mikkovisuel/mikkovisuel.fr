import "server-only";
import { google, gmail_v1 } from "googleapis";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/dal";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secrets";

// Scopes volontairement restreints : lecture + envoi, jamais
// `gmail.modify` (qui permettrait aussi de supprimer/labelliser des
// messages dans le vrai Gmail de l'admin — inutile pour cette
// fonctionnalité, et un écran de consentement Google plus simple à
// valider en mode Testing).
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  // Onglet Mail (2026-10-21) : ranger (archiver, corbeille, lu/non lu,
  // étoile, libellés) et brouillons. Une ancienne connexion sans ce droit
  // lève `GmailPermissionError` : il suffit de reconnecter Gmail.
  "https://www.googleapis.com/auth/gmail.modify",
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

// Jeton anti-détournement : sans lui, un lien de retour forgé avec le code
// d'un autre compte Google relierait ce compte au profil de l'admin.
export const GMAIL_OAUTH_STATE_COOKIE = "gmail_oauth_state";

export function getGmailAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    // Force le renvoi d'un refresh_token même si l'admin avait déjà
    // autorisé l'app avant (Google ne le renvoie qu'à la première
    // autorisation, sauf avec ce paramètre).
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });
}

// Échange le code retourné par Google contre les tokens, récupère
// l'adresse Gmail connectée, chiffre le refresh token et le stocke sur le
// compte Admin courant — chaque admin connecte sa propre boîte Gmail
// (multi-admin, 2026-07-29), d'où l'appel à `getAdminSession()` plutôt que
// `db.admin.findFirstOrThrow()`. Les appelants (route de callback OAuth,
// Server Action) ont déjà vérifié la session via `verifyAdminSession()` en
// amont, donc `getAdminSession()` la retrouve ici sans coût (mise en cache
// React) plutôt que de la revérifier.
export async function connectGmailAccount(code: string) {
  const admin = await getAdminSession();
  if (!admin) throw new Error("Session admin introuvable.");

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
  const admin = await getAdminSession();
  if (!admin) throw new Error("Session admin introuvable.");
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

// Client Gmail authentifié pour l'admin courant — chaque admin connecte sa
// propre boîte (multi-admin, 2026-07-29), donc `getAdminSession()` (pas
// `db.admin.findFirstOrThrow()`) détermine de quel compte il s'agit. Lève
// `GmailNotConnectedError` si aucun compte n'a encore été connecté, OU si
// le refresh token stocké a expiré/a été révoqué côté Google
// (`invalid_grant` — ça arrive, ex. après 6 mois d'inactivité ou une
// révocation manuelle) : les deux cas doivent afficher le même état "Gmail
// non connecté" plutôt qu'une erreur 500, donc on force ici la première
// tentative de rafraîchissement du token pour détecter le cas expiré tout
// de suite, une seule fois, plutôt que de laisser chaque appel Gmail
// (recherche, lecture, envoi...) potentiellement planter plus loin.
async function getGmailClient() {
  const admin = await getAdminSession();
  if (!admin || !admin.gmailRefreshTokenEnc || !admin.gmailEmail) {
    throw new GmailNotConnectedError();
  }

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: decryptSecret(admin.gmailRefreshTokenEnc) });

  try {
    await client.getAccessToken();
  } catch (error) {
    const gaxiosCode = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
    if (gaxiosCode === "invalid_grant") {
      throw new GmailNotConnectedError();
    }
    throw error;
  }

  return { gmail: google.gmail({ version: "v1", auth: client }), email: admin.gmailEmail, auth: client };
}

/** Vrai si la connexion Gmail actuelle autorise le rangement (droit « modify »). */
export async function canModifyMail(): Promise<boolean> {
  const { auth } = await getGmailClient();
  const { token } = await auth.getAccessToken();
  if (!token) return false;
  const info = await auth.getTokenInfo(token);
  return info.scopes.includes("https://www.googleapis.com/auth/gmail.modify");
}

export class GmailPermissionError extends Error {
  constructor() {
    super("Reconnectez Gmail (Réglages) pour autoriser le rangement des e-mails.");
    this.name = "GmailPermissionError";
  }
}

function rethrowPermission(error: unknown): never {
  const status = (error as { code?: number; status?: number })?.code ?? (error as { status?: number })?.status;
  if (status === 403) throw new GmailPermissionError();
  throw error;
}

export interface EmailThreadSummary {
  id: string;
  snippet: string;
  subject: string;
  lastMessageFrom: string;
  lastMessageTo: string;
  lastMessageDate: Date | null;
  messageCount: number;
  // Vrai si au moins un message du fil porte encore le label Gmail
  // `UNREAD`. Reflète l'état réel du Gmail de l'admin — consulter un fil
  // dans l'app ne le marque pas comme lu (scope volontairement restreint à
  // lecture + envoi, jamais `gmail.modify`, voir `GMAIL_SCOPES`).
  isUnread: boolean;
  /** Libellés Gmail du fil (STARRED, IMPORTANT, INBOX, libellés perso…). */
  labelIds: string[];
}

function headerValue(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

async function fetchThreadSummary(
  gmail: gmail_v1.Gmail,
  threadId: string,
): Promise<{ summary: EmailThreadSummary; fromHeader: string; toHeader: string } | null> {
  const { data: full } = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["From", "To", "Subject", "Date"],
  });
  const messages = full.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const headers = lastMessage?.payload?.headers;
  const dateHeader = headerValue(headers, "Date");
  const fromHeader = headerValue(headers, "From");
  const toHeader = headerValue(headers, "To");

  return {
    summary: {
      id: threadId,
      snippet: full.snippet ?? "",
      subject: headerValue(headers, "Subject") || "(sans objet)",
      lastMessageFrom: fromHeader,
      lastMessageTo: toHeader,
      lastMessageDate: dateHeader ? new Date(dateHeader) : null,
      messageCount: messages.length,
      isUnread: messages.some((message) => message.labelIds?.includes("UNREAD")),
      labelIds: [...new Set(messages.flatMap((message) => message.labelIds ?? []))],
    },
    fromHeader,
    toHeader,
  };
}

// Recherche les fils de discussion Gmail impliquant l'une des adresses
// données (comptes de connexion du client) — `from:`/`to:` couvre les deux
// sens de la conversation. `keyword` restreint en plus aux fils dont
// l'objet ou le corps contient ce texte (syntaxe de recherche Gmail
// standard, cherche par défaut dans les deux). Triés par pertinence/récence.
export async function searchThreadsForEmails(
  emails: string[],
  keyword?: string,
): Promise<EmailThreadSummary[]> {
  if (emails.length === 0) return [];
  const { gmail } = await getGmailClient();

  const emailQuery = emails.map((email) => `(from:${email} OR to:${email})`).join(" OR ");
  const query = keyword?.trim() ? `(${emailQuery}) ${keyword.trim()}` : emailQuery;
  const { data } = await gmail.users.threads.list({ userId: "me", q: query, maxResults: 30 });
  const threads = data.threads ?? [];

  const results = await Promise.all(
    threads.map((thread) => (thread.id ? fetchThreadSummary(gmail, thread.id) : null)),
  );

  return results
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .map((result) => result.summary)
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
  cc: string;
  date: Date | null;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  attachments: EmailAttachment[];
  messageIdHeader: string;
  referencesHeader: string;
  isUnread: boolean;
  labelIds: string[];
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
      cc: headerValue(headers, "Cc"),
      date: dateHeader ? new Date(dateHeader) : null,
      subject: headerValue(headers, "Subject") || "(sans objet)",
      bodyHtml: acc.html,
      bodyText: acc.text,
      attachments: acc.attachments,
      messageIdHeader: headerValue(headers, "Message-ID"),
      referencesHeader: headerValue(headers, "References"),
      isUnread: message.labelIds?.includes("UNREAD") ?? false,
      labelIds: message.labelIds ?? [],
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
  cc?: string;
  subject: string;
  bodyHtml: string;
  /** Présent pour une réponse/un transfert dans le même fil Gmail. */
  threadId?: string;
  /** `Message-ID` du message auquel on répond (pour `In-Reply-To`/`References`). */
  inReplyToMessageId?: string;
  referencesHeader?: string;
  attachments?: { filename: string; mimeType: string; content: Buffer }[];
}

// Construit un message RFC 2822 (multipart s'il y a des pièces jointes).
// `threadId` + `In-Reply-To`/`References` rattachent l'envoi au fil existant
// dans le vrai Gmail — sans ça, Gmail créerait un nouveau fil.
export function buildRaw(input: SendMessageInput, from: string) {
  const lines = [`From: ${from}`, `To: ${input.to}`];
  if (input.cc) lines.push(`Cc: ${input.cc}`);
  lines.push(`Subject: ${encodeHeaderIfNeeded(input.subject)}`, "MIME-Version: 1.0");
  if (input.inReplyToMessageId) lines.push(`In-Reply-To: ${input.inReplyToMessageId}`);
  if (input.referencesHeader) lines.push(`References: ${input.referencesHeader}`);

  if (!input.attachments?.length) {
    lines.push('Content-Type: text/html; charset="UTF-8"', "", input.bodyHtml);
  } else {
    const boundary = `mv-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`, "", `--${boundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"', "", input.bodyHtml);
    for (const file of input.attachments) {
      lines.push(
        `--${boundary}`,
        `Content-Type: ${file.mimeType || "application/octet-stream"}; name="${encodeHeaderIfNeeded(file.filename)}"`,
        `Content-Disposition: attachment; filename="${encodeHeaderIfNeeded(file.filename)}"`,
        "Content-Transfer-Encoding: base64",
        "",
        file.content.toString("base64").replace(/.{76}/g, "$&\r\n"),
      );
    }
    lines.push(`--${boundary}--`);
  }
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

export async function sendMessage(input: SendMessageInput): Promise<void> {
  const { gmail, email } = await getGmailClient();
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRaw(input, email), threadId: input.threadId },
  });
}

/** Enregistre un brouillon dans Gmail (dossier Brouillons). */
export async function createDraft(input: SendMessageInput): Promise<void> {
  const { gmail, email } = await getGmailClient();
  await gmail.users.drafts
    .create({ userId: "me", requestBody: { message: { raw: buildRaw(input, email), threadId: input.threadId } } })
    .catch(rethrowPermission);
}

// --- Onglet Mail (2026-10-21) ---------------------------------------------

export interface MailboxLabel {
  id: string;
  name: string;
}

/** Libellés créés par l'admin (les dossiers système sont fixes dans l'onglet). */
export async function listUserLabels(): Promise<MailboxLabel[]> {
  const { gmail } = await getGmailClient();
  const { data } = await gmail.users.labels.list({ userId: "me" });
  return (data.labels ?? [])
    .filter((label) => label.type === "user" && label.id && label.name)
    .map((label) => ({ id: label.id!, name: label.name! }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function inboxUnreadCount(): Promise<number> {
  const { gmail } = await getGmailClient();
  const { data } = await gmail.users.labels.get({ userId: "me", id: "INBOX" });
  return data.threadsUnread ?? 0;
}

// shortcut: une page = 25 fils, chacun relu en métadonnées (10 unités de
// quota Gmail par fil) ; au-delà, passer par l'API batch de Gmail.
export async function listThreads(params: {
  labelId?: string;
  query?: string;
  pageToken?: string;
}): Promise<{ threads: EmailThreadSummary[]; nextPageToken: string | null; estimate: number }> {
  const { gmail } = await getGmailClient();
  const { data } = await gmail.users.threads.list({
    userId: "me",
    maxResults: 25,
    ...(params.labelId ? { labelIds: [params.labelId] } : {}),
    ...(params.query ? { q: params.query } : {}),
    ...(params.pageToken ? { pageToken: params.pageToken } : {}),
    includeSpamTrash: params.labelId === "TRASH" || params.labelId === "SPAM",
  });
  const summaries = await Promise.all(
    (data.threads ?? []).map((thread) => (thread.id ? fetchThreadSummary(gmail, thread.id) : null)),
  );
  return {
    threads: summaries.filter((s): s is NonNullable<typeof s> => s !== null).map((s) => s.summary),
    nextPageToken: data.nextPageToken ?? null,
    estimate: data.resultSizeEstimate ?? 0,
  };
}

/** Ajoute / retire des libellés sur des fils (UNREAD, STARRED, INBOX, libellé perso…). */
export async function modifyThreads(threadIds: string[], change: { add?: string[]; remove?: string[] }) {
  const { gmail } = await getGmailClient();
  await Promise.all(
    threadIds.map((id) =>
      gmail.users.threads.modify({
        userId: "me",
        id,
        requestBody: { addLabelIds: change.add ?? [], removeLabelIds: change.remove ?? [] },
      }),
    ),
  ).catch(rethrowPermission);
}

/** Corbeille Gmail (récupérable 30 jours), jamais de suppression définitive. */
export async function trashThreads(threadIds: string[], restore = false) {
  const { gmail } = await getGmailClient();
  await Promise.all(
    threadIds.map((id) =>
      restore ? gmail.users.threads.untrash({ userId: "me", id }) : gmail.users.threads.trash({ userId: "me", id }),
    ),
  ).catch(rethrowPermission);
}
