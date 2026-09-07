"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { sendEmailToAdmins, getAdminEmails } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { sendMessage, GmailNotConnectedError } from "@/lib/gmail";
import { sendClientPasswordResetEmail } from "@/lib/actions/password-reset";
import { PROSPECT_STATUS, PROSPECT_STATUS_LIST_KEY, type ProspectStatusSlug } from "@/lib/dropdown-lists";
import { GmailMessageSchema, type GmailMessageFormState } from "@/lib/validation/gmail-message";
import {
  ProspectSchema,
  ProspectSearchSchema,
  type ProspectFormState,
  type ProspectSearchState,
  type ImportProspectsState,
} from "@/lib/validation/prospect";
import { findProspectsWithAI } from "@/lib/prospect-search";
import { logProspectActivity } from "@/lib/prospect-activity";
import { parseCsv } from "@/lib/csv";

// Miroir de `textToHtml` dans src/lib/actions/gmail-messages.ts — le
// composeur est un simple <textarea>, converti en un minimum de HTML pour
// que les retours à la ligne survivent à l'envoi.
function textToHtml(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("<br>");
}

async function getProspectStatusItem(slug: ProspectStatusSlug) {
  const list = await db.dropdownList.findUniqueOrThrow({ where: { key: PROSPECT_STATUS_LIST_KEY } });
  return db.dropdownItem.findUniqueOrThrow({
    where: { listId_slug: { listId: list.id, slug } },
  });
}

function revalidateProspectPaths(prospectId?: string) {
  revalidatePath("/admin/prospection");
  if (prospectId) revalidatePath(`/admin/prospection/${prospectId}`);
}

function parseProspectForm(formData: FormData) {
  return ProspectSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    address: formData.get("address"),
    city: formData.get("city"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    instagram: formData.get("instagram"),
    instagramUrl: formData.get("instagramUrl"),
    website: formData.get("website"),
    whatsappUrl: formData.get("whatsappUrl"),
    activityLevel: formData.get("activityLevel"),
    notes: formData.get("notes"),
    statusSlug: formData.get("statusSlug"),
    nextReminderAt: formData.get("nextReminderAt"),
  });
}

export async function createProspect(
  _prev: ProspectFormState,
  formData: FormData,
): Promise<ProspectFormState> {
  await verifyAdminSession();

  const parsed = parseProspectForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const statusItem = await getProspectStatusItem(parsed.data.statusSlug as ProspectStatusSlug);

  const prospect = await db.prospect.create({
    data: {
      name: parsed.data.name,
      company: parsed.data.company || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email,
      instagram: parsed.data.instagram || null,
      instagramUrl: parsed.data.instagramUrl || null,
      website: parsed.data.website || null,
      whatsappUrl: parsed.data.whatsappUrl || null,
      activityLevel: parsed.data.activityLevel || null,
      notes: parsed.data.notes || null,
      statusId: statusItem.id,
      nextReminderAt: parsed.data.nextReminderAt ? new Date(parsed.data.nextReminderAt) : null,
    },
  });
  await logProspectActivity(prospect.id, "created", `Prospect créé (statut : ${statusItem.label}).`);

  revalidateProspectPaths();
  redirect(`/admin/prospection/${prospect.id}`);
}

export async function updateProspect(
  prospectId: string,
  _prev: ProspectFormState,
  formData: FormData,
): Promise<ProspectFormState> {
  await verifyAdminSession();

  const parsed = parseProspectForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const existing = await db.prospect.findUnique({
    where: { id: prospectId },
    include: { status: true },
  });
  if (!existing) return { error: "Prospect introuvable." };

  const statusItem = await getProspectStatusItem(parsed.data.statusSlug as ProspectStatusSlug);
  const nextReminderAt = parsed.data.nextReminderAt ? new Date(parsed.data.nextReminderAt) : null;
  const reminderChanged = nextReminderAt?.getTime() !== existing.nextReminderAt?.getTime();
  const statusChanged = existing.statusId !== statusItem.id;

  await db.prospect.update({
    where: { id: prospectId },
    data: {
      name: parsed.data.name,
      company: parsed.data.company || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email,
      instagram: parsed.data.instagram || null,
      instagramUrl: parsed.data.instagramUrl || null,
      website: parsed.data.website || null,
      whatsappUrl: parsed.data.whatsappUrl || null,
      activityLevel: parsed.data.activityLevel || null,
      notes: parsed.data.notes || null,
      statusId: statusItem.id,
      nextReminderAt,
      // Repart à zéro dès que la date de relance change (même pattern que
      // Note.reminderAt/reminderSentAt) — sinon une relance déjà envoyée
      // resterait marquée "envoyée" pour une toute nouvelle échéance.
      ...(reminderChanged ? { reminderSentAt: null } : {}),
    },
  });
  if (statusChanged) {
    await logProspectActivity(
      prospectId,
      "status_change",
      `Statut changé : ${existing.status.label} → ${statusItem.label}.`,
    );
  }

  revalidateProspectPaths(prospectId);
  return undefined;
}

export async function deleteProspect(prospectId: string) {
  await verifyAdminSession();
  await db.prospect.delete({ where: { id: prospectId } });
  revalidateProspectPaths();
  redirect("/admin/prospection");
}

const PROSPECT_TEXT_FIELDS = [
  "name",
  "company",
  "city",
  "phone",
  "email",
  "instagram",
  "instagramUrl",
  "whatsappUrl",
  "activityLevel",
] as const;
export type ProspectTextField = (typeof PROSPECT_TEXT_FIELDS)[number];

// Édition en place d'une seule cellule sur la vue Liste (tableur), miroir de
// `updatePaymentRecordDate` pour les Finances — pas de formulaire complet ni
// de redirection, juste la valeur de la cellule modifiée.
export async function updateProspectField(prospectId: string, field: ProspectTextField, rawValue: string) {
  await verifyAdminSession();
  if (!PROSPECT_TEXT_FIELDS.includes(field)) return;

  const value = rawValue.trim();

  // Le nom est requis (ProspectSchema) : une cellule vidée par erreur ne
  // doit pas effacer le nom en base, contrairement aux autres champs
  // optionnels ci-dessous.
  if (field === "name") {
    if (value === "") return;
    await db.prospect.update({ where: { id: prospectId }, data: { name: value } });
    revalidateProspectPaths(prospectId);
    return;
  }

  if (field === "email") {
    if (value === "") {
      await db.prospect.update({ where: { id: prospectId }, data: { email: null } });
      revalidateProspectPaths(prospectId);
      return;
    }
    const parsed = z.string().trim().toLowerCase().email().safeParse(value);
    if (!parsed.success) return;
    await db.prospect.update({ where: { id: prospectId }, data: { email: parsed.data } });
    revalidateProspectPaths(prospectId);
    return;
  }

  await db.prospect.update({ where: { id: prospectId }, data: { [field]: value || null } });
  revalidateProspectPaths(prospectId);
}

// Champ "Relance" de la vue tableur — même logique que `updateProspect` pour
// la remise à zéro de `reminderSentAt` quand la date change, sans passer par
// le reste du formulaire.
export async function updateProspectReminderDate(prospectId: string, dateValue: string) {
  await verifyAdminSession();

  const existing = await db.prospect.findUnique({
    where: { id: prospectId },
    select: { nextReminderAt: true },
  });
  if (!existing) return;

  let nextReminderAt: Date | null = null;
  if (dateValue) {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return;
    nextReminderAt = parsedDate;
  }

  const reminderChanged = nextReminderAt?.getTime() !== existing.nextReminderAt?.getTime();
  await db.prospect.update({
    where: { id: prospectId },
    data: { nextReminderAt, ...(reminderChanged ? { reminderSentAt: null } : {}) },
  });
  revalidateProspectPaths(prospectId);
}

// Pour le Kanban (glisser-déposer) et le sélecteur de statut rapide — miroir
// de `setTaskStatus` dans src/lib/actions/tasks.ts.
export async function setProspectStatus(prospectId: string, statusSlug: ProspectStatusSlug) {
  await verifyAdminSession();

  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    include: { status: true },
  });
  if (!prospect) return;

  const statusItem = await getProspectStatusItem(statusSlug);
  if (statusItem.id === prospect.statusId) return;

  await db.prospect.update({ where: { id: prospectId }, data: { statusId: statusItem.id } });
  await logProspectActivity(
    prospectId,
    "status_change",
    `Statut changé : ${prospect.status.label} → ${statusItem.label}.`,
  );
  revalidateProspectPaths(prospectId);
}

// Sélection multi-lignes sur la vue Liste (demande du 2026-08-17), même
// pattern que bulkSetTaskStatus/bulkArchiveTasks (src/lib/actions/tasks.ts) :
// on rejoue l'action unitaire déjà existante pour chaque id plutôt que
// dupliquer sa logique (log d'activité inclus pour le statut).
export async function bulkSetProspectStatus(prospectIds: string[], statusSlug: ProspectStatusSlug) {
  await Promise.all(prospectIds.map((id) => setProspectStatus(id, statusSlug)));
}

// Suppression groupée — pas un simple relais vers `deleteProspect`, qui se
// termine par un `redirect()` (pensé pour le bouton de la fiche complète) :
// appelé en boucle dans un `Promise.all`, ce redirect lèverait son signal
// `NEXT_REDIRECT` dès le premier prospect et interromprait les suivants.
export async function bulkDeleteProspects(prospectIds: string[]) {
  await verifyAdminSession();
  await db.prospect.deleteMany({ where: { id: { in: prospectIds } } });
  revalidateProspectPaths();
}

// Bouton "Envoyer un email" sur la fiche prospect — réutilise le vrai Gmail
// de l'admin (comme pour les clients), plus personnel qu'un envoi
// no-reply@ via Resend. Si Gmail n'est pas connecté, l'appelant (page) doit
// proposer un lien `mailto:` de repli plutôt que d'afficher ce composeur.
export async function sendProspectEmail(
  prospectId: string,
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

  try {
    await sendMessage({
      to: parsed.data.to,
      subject: parsed.data.subject,
      bodyHtml: textToHtml(parsed.data.body),
    });
  } catch (error) {
    if (error instanceof GmailNotConnectedError) {
      return { error: "Connectez Gmail depuis Réglages pour envoyer des emails depuis l'admin." };
    }
    throw error;
  }

  await logProspectActivity(
    prospectId,
    "email_sent",
    `Email envoyé à ${parsed.data.to} — objet : "${parsed.data.subject}".`,
  );

  revalidatePath(`/admin/prospection/${prospectId}`);
  return { success: true };
}

// Relance manuelle immédiate (miroir de `sendTaskReminder`/
// `sendPaymentReminder`) — alerte l'admin lui-même, ce n'est pas un email
// envoyé au prospect (voir aussi le cron planifié, src/lib/prospect-reminders.ts).
export async function sendProspectReminderNow(prospectId: string) {
  await verifyAdminSession();

  const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) return;

  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return;

  await sendEmailToAdmins({
    trigger: "prospect_reminder",
    subject: `Relance prospection — ${prospect.name}`,
    html: `<p>Rappel manuel : il est temps de relancer <strong>${escapeHtml(prospect.name)}</strong>${
      prospect.company ? ` (${escapeHtml(prospect.company)})` : ""
    }.</p>`,
  });

  await db.prospect.update({ where: { id: prospectId }, data: { reminderSentAt: new Date() } });
  await logProspectActivity(prospectId, "reminder_sent", "Relance envoyée manuellement.");
  revalidateProspectPaths(prospectId);
}

export type ConvertProspectState = { error?: string } | undefined;

// Bouton "Convertir en client" — crée un Client classique (+ un compte de
// connexion si un email est renseigné, avec un mot de passe aléatoire suivi
// immédiatement d'un email "définissez votre mot de passe", réutilisant le
// même flux que `sendClientPasswordResetEmail` plutôt que d'exposer un mot
// de passe en clair choisi par l'admin). Le prospect n'est jamais supprimé :
// il passe au statut "Fermé" et garde un lien vers le client créé.
export async function convertProspectToClient(prospectId: string): Promise<ConvertProspectState> {
  await verifyAdminSession();

  const prospect = await db.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) return { error: "Prospect introuvable." };
  if (prospect.convertedClientId) return { error: "Ce prospect a déjà été converti." };

  const client = await db.client.create({
    data: {
      name: prospect.company || prospect.name,
      address: prospect.address,
      billingEmail: prospect.email,
      notes: prospect.notes,
    },
  });

  // Pas de compte de connexion créé si le prospect n'a pas d'email —
  // signalé à l'admin via un paramètre d'URL plutôt qu'un état de
  // formulaire, puisque cette action se termine par un redirect. Si un
  // `Contact` existe déjà avec cet email (ex. prospect issu d'un client déjà
  // présent), on le **rattache** au nouveau client plutôt que de refuser —
  // c'est exactement le cas d'usage du split Contact/ClientContact du
  // 2026-07-31 : "un contact peut être dans plusieurs fiches clients".
  const noLoginReason: "no-email" | null = prospect.email ? null : "no-email";
  if (prospect.email) {
    const existingContact = await db.contact.findUnique({ where: { email: prospect.email } });
    if (existingContact) {
      await db.clientContact.create({ data: { clientId: client.id, contactId: existingContact.id } });
    } else {
      const randomPassword = randomBytes(24).toString("hex");
      const newContact = await db.contact.create({
        data: { name: prospect.name, email: prospect.email, phone: prospect.phone },
      });
      const clientUser = await db.clientContact.create({
        data: {
          clientId: client.id,
          contactId: newContact.id,
          passwordHash: await hashPassword(randomPassword),
        },
      });
      await sendClientPasswordResetEmail({ id: clientUser.id, email: newContact.email });
    }
  }

  const statusItem = await getProspectStatusItem(PROSPECT_STATUS.FERME);
  await db.prospect.update({
    where: { id: prospectId },
    data: {
      statusId: statusItem.id,
      convertedClientId: client.id,
      convertedAt: new Date(),
    },
  });

  await logProspectActivity(
    prospectId,
    "converted",
    `Converti en client : "${client.name}".`,
  );

  revalidateProspectPaths(prospectId);
  revalidatePath("/admin/clients");
  redirect(
    noLoginReason
      ? `/admin/clients/${client.id}?prospectConversion=${noLoginReason}`
      : `/admin/clients/${client.id}?prospectConversion=ok`,
  );
}

// Bouton "Rechercher des prospects (IA)" sur /admin/prospection — voir
// src/lib/prospect-search.ts pour l'appel à l'API Anthropic (recherche web).
// Masqué côté UI si ANTHROPIC_API_KEY est absente ; revérifié ici aussi
// (l'action reste protégée même si quelqu'un la déclenche autrement).
export async function searchProspectsWithAI(
  _prev: ProspectSearchState,
  formData: FormData,
): Promise<ProspectSearchState> {
  await verifyAdminSession();

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY n'est pas configurée — recherche automatique indisponible." };
  }

  const parsed = ProspectSearchSchema.safeParse({
    query: formData.get("query"),
    limit: formData.get("limit"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  let found;
  try {
    found = await findProspectsWithAI(parsed.data.query, parsed.data.limit);
  } catch (error) {
    return {
      error: `Recherche IA impossible : ${error instanceof Error ? error.message : "erreur inconnue"}.`,
    };
  }

  if (found.length === 0) {
    return { message: "Aucun prospect trouvé pour cette recherche." };
  }

  const existing = await db.prospect.findMany({ select: { email: true, instagram: true } });
  const existingEmails = new Set(existing.map((p) => p.email?.toLowerCase()).filter(Boolean));
  const existingInstagrams = new Set(existing.map((p) => p.instagram?.toLowerCase()).filter(Boolean));

  const newProspects = found.filter((prospect) => {
    const emailTaken = prospect.email && existingEmails.has(prospect.email.toLowerCase());
    const instagramTaken = prospect.instagram && existingInstagrams.has(prospect.instagram.toLowerCase());
    return !emailTaken && !instagramTaken;
  });
  const duplicateCount = found.length - newProspects.length;

  if (newProspects.length > 0) {
    const statusItem = await getProspectStatusItem(PROSPECT_STATUS.A_FAIRE);
    const searchNote = `Trouvé par la recherche IA le ${new Date().toLocaleDateString("fr-FR")} — requête : "${parsed.data.query}".`;
    await db.prospect.createMany({
      data: newProspects.map((prospect) => ({
        name: prospect.name,
        company: prospect.company,
        address: prospect.address,
        city: prospect.city,
        phone: prospect.phone,
        email: prospect.email,
        instagram: prospect.instagram,
        instagramUrl: prospect.instagramUrl,
        website: prospect.website,
        whatsappUrl: prospect.whatsappUrl,
        activityLevel: prospect.activityLevel,
        // `matchReason` (qualification IA) ajouté à la note plutôt que dans
        // un champ dédié — même note affichée sur la fiche prospect,
        // toujours traçable à la recherche d'origine.
        notes: prospect.matchReason ? `${searchNote} ${prospect.matchReason}` : searchNote,
        statusId: statusItem.id,
        source: "recherche_ia",
      })),
    });
  }

  revalidateProspectPaths();

  const parts = [`${newProspects.length} prospect${newProspects.length > 1 ? "s" : ""} ajouté${newProspects.length > 1 ? "s" : ""}`];
  if (duplicateCount > 0) parts.push(`${duplicateCount} doublon${duplicateCount > 1 ? "s" : ""} ignoré${duplicateCount > 1 ? "s" : ""}`);
  return { message: parts.join(", ") + "." };
}

const MAX_CSV_SIZE = 2 * 1024 * 1024;

// Tolère plusieurs libellés de colonne par champ (le fichier peut venir
// d'un autre outil que le modèle fourni, ex. un agent externe) — normalisé
// sans accents/casse/espaces avant comparaison.
// "activite" est réservé à `activityLevel` (ex. "Très actif", "254 posts") —
// avant d'avoir un vrai fichier de référence (2026-08-17), ce libellé était
// pris comme synonyme de `company` ; ambigu maintenant que les deux notions
// coexistent, tranché en faveur du sens le plus littéral.
const COLUMN_SYNONYMS: Record<string, string[]> = {
  name: ["nom", "etablissement", "name"],
  company: ["entreprise", "societe", "company"],
  address: ["adresse", "address"],
  city: ["ville", "city"],
  phone: ["telephone", "tel", "phone"],
  email: ["email", "mail", "e-mail"],
  instagram: ["instagram", "insta"],
  instagramUrl: ["lien instagram", "url instagram", "instagram url", "lien insta"],
  website: ["siteweb", "site web", "siteinternet", "site internet", "website", "site"],
  whatsappUrl: ["lien whatsapp", "whatsapp", "url whatsapp", "whatsapp url"],
  activityLevel: ["activite", "niveau d'activite"],
  // Colonne combinant souvent téléphone et email sur une même cellule (ex.
  // repérage terrain) — jamais utilisée directement, voir `splitContactCell`.
  contact: ["contact"],
  notes: ["notes", "note", "commentaire", "commentaires"],
};

const EMAIL_IN_TEXT = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const PHONE_IN_TEXT = /(?:\+33|0)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}/;

// Sépare une cellule "Contact" mêlant téléphone(s)/email en une seule
// chaîne (ex. "06 72 03 33 98 / thibault.lespotclub@gmail.com") — ne garde
// que le premier téléphone et le premier email trouvés, le reste (numéro
// secondaire, fixe...) est reversé dans les notes plutôt que perdu.
function splitContactCell(raw: string): { phone: string | null; email: string | null; extra: string | null } {
  const parts = raw
    .split(/[/,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  let phone: string | null = null;
  let email: string | null = null;
  const leftovers: string[] = [];

  for (const part of parts) {
    const emailMatch = part.match(EMAIL_IN_TEXT);
    if (emailMatch && !email) {
      email = emailMatch[0].toLowerCase();
      continue;
    }
    const phoneMatch = part.match(PHONE_IN_TEXT);
    if (phoneMatch && !phone) {
      phone = phoneMatch[0].trim();
      continue;
    }
    leftovers.push(part);
  }

  return { phone, email, extra: leftovers.length > 0 ? leftovers.join(" / ") : null };
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function buildColumnIndex(header: string[]): Map<string, number> {
  const normalized = header.map(normalizeHeader);
  const index = new Map<string, number>();
  for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    const normalizedSynonyms = synonyms.map(normalizeHeader);
    const found = normalized.findIndex((h) => normalizedSynonyms.includes(h));
    if (found !== -1) index.set(field, found);
  }
  return index;
}

function getCell(row: string[], columnIndex: Map<string, number>, field: string): string | null {
  const idx = columnIndex.get(field);
  if (idx === undefined) return null;
  const value = row[idx]?.trim();
  return value ? value : null;
}

// Import CSV depuis le bouton "Importer un fichier CSV" sur
// /admin/prospection — pense notamment au cas d'un fichier produit par un
// agent de recherche externe (cowork), pas seulement le modèle fourni en
// téléchargement, d'où la tolérance sur les intitulés de colonnes
// (COLUMN_SYNONYMS) plutôt qu'un format strict.
export async function importProspectsFromCsv(
  _prev: ImportProspectsState,
  formData: FormData,
): Promise<ImportProspectsState> {
  await verifyAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier CSV." };
  }
  if (file.size > MAX_CSV_SIZE) {
    return { error: "Fichier trop volumineux (2 Mo maximum)." };
  }

  const text = await file.text();
  return insertProspectsFromCsvText(text, "import_csv");
}

// Import depuis un Google Sheet (demande du 2026-08-17) — même parseur/mêmes
// colonnes reconnues que le CSV (COLUMN_SYNONYMS), pas un chemin séparé :
// seule la façon d'obtenir le texte CSV change. Aucune API Google/OAuth
// requise (contrairement à l'intégration Gmail existante, voir
// src/lib/gmail.ts) : Google Sheets sait exporter n'importe quelle feuille
// en CSV via une simple URL (`/export?format=csv`), tant qu'elle est
// partagée en "Toute personne disposant du lien" — même modèle de partage
// que `Client.driveUrl`, déjà utilisé ailleurs dans ce projet.
const GOOGLE_SHEET_URL_PATTERN =
  /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const MAX_SHEET_CSV_SIZE = 2 * 1024 * 1024;

function buildSheetExportUrl(sheetUrl: string): string | null {
  const match = sheetUrl.trim().match(GOOGLE_SHEET_URL_PATTERN);
  if (!match) return null;
  const spreadsheetId = match[1];
  // Le gid (onglet précis) peut être en query (?gid=) ou en fragment
  // (#gid=), selon comment le lien a été copié — on tente les deux.
  const gidMatch = sheetUrl.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch?.[1];
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}

export async function importProspectsFromGoogleSheet(
  _prev: ImportProspectsState,
  formData: FormData,
): Promise<ImportProspectsState> {
  await verifyAdminSession();

  const sheetUrlRaw = formData.get("sheetUrl");
  if (typeof sheetUrlRaw !== "string" || sheetUrlRaw.trim() === "") {
    return { error: "Collez le lien de votre Google Sheet." };
  }

  const exportUrl = buildSheetExportUrl(sheetUrlRaw);
  if (!exportUrl) {
    return {
      error:
        "Lien non reconnu — collez l'URL d'un Google Sheet (https://docs.google.com/spreadsheets/d/...).",
    };
  }

  let response: Response;
  try {
    // Timeout défensif : une requête sortante vers un service externe ne
    // doit jamais bloquer indéfiniment une Server Action.
    response = await fetch(exportUrl, { signal: AbortSignal.timeout(15_000) });
  } catch {
    return { error: "Impossible de joindre Google Sheets — réessayez dans un instant." };
  }

  // Un Sheet non partagé (ou lien invalide) renvoie une page de connexion
  // Google HTML, pas une erreur HTTP franche — le Content-Type est le
  // signal le plus fiable pour distinguer un vrai export CSV d'un refus
  // d'accès déguisé en page web.
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("csv")) {
    return {
      error:
        "Accès refusé par Google Sheets — vérifiez le partage : Partager → \"Toute personne disposant du lien\" → Lecteur.",
    };
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SHEET_CSV_SIZE) {
    return { error: "Feuille trop volumineuse (2 Mo maximum une fois exportée en CSV)." };
  }

  const text = await response.text();
  if (text.length > MAX_SHEET_CSV_SIZE) {
    return { error: "Feuille trop volumineuse (2 Mo maximum une fois exportée en CSV)." };
  }

  return insertProspectsFromCsvText(text, "import_google_sheet");
}

async function insertProspectsFromCsvText(
  text: string,
  source: "import_csv" | "import_google_sheet",
): Promise<ImportProspectsState> {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { error: "Fichier vide ou sans ligne de données." };
  }

  const [header, ...dataRows] = rows;
  const columnIndex = buildColumnIndex(header);
  if (!columnIndex.has("name")) {
    return { error: "Colonne \"nom\" introuvable — utilisez le modèle fourni." };
  }

  let skippedNoName = 0;
  const candidates: {
    name: string;
    company: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    instagram: string | null;
    instagramUrl: string | null;
    website: string | null;
    whatsappUrl: string | null;
    activityLevel: string | null;
    notes: string | null;
  }[] = [];

  for (const row of dataRows) {
    if (row.every((cell) => cell.trim() === "")) continue;
    const name = getCell(row, columnIndex, "name");
    if (!name) {
      skippedNoName++;
      continue;
    }
    let phone = getCell(row, columnIndex, "phone");
    let email = getCell(row, columnIndex, "email");
    let contactExtra: string | null = null;
    // Repli sur la colonne "Contact" combinée seulement pour les champs pas
    // déjà trouvés dans des colonnes dédiées.
    if ((!phone || !email) && columnIndex.has("contact")) {
      const rawContact = getCell(row, columnIndex, "contact");
      if (rawContact) {
        const split = splitContactCell(rawContact);
        phone = phone ?? split.phone;
        email = email ?? split.email;
        contactExtra = split.extra;
      }
    }
    candidates.push({
      name,
      company: getCell(row, columnIndex, "company"),
      address: getCell(row, columnIndex, "address"),
      city: getCell(row, columnIndex, "city"),
      phone,
      email: email ? email.toLowerCase() : null,
      instagram: getCell(row, columnIndex, "instagram"),
      instagramUrl: getCell(row, columnIndex, "instagramUrl"),
      website: getCell(row, columnIndex, "website"),
      whatsappUrl: getCell(row, columnIndex, "whatsappUrl"),
      activityLevel: getCell(row, columnIndex, "activityLevel"),
      notes: [getCell(row, columnIndex, "notes"), contactExtra].filter(Boolean).join(" — ") || null,
    });
  }

  if (candidates.length === 0) {
    return { error: "Aucune ligne exploitable (nom manquant sur toutes les lignes)." };
  }

  const existing = await db.prospect.findMany({ select: { email: true, instagram: true } });
  const existingEmails = new Set(existing.map((p) => p.email?.toLowerCase()).filter(Boolean));
  const existingInstagrams = new Set(existing.map((p) => p.instagram?.toLowerCase()).filter(Boolean));
  const seenEmails = new Set<string>();
  const seenInstagrams = new Set<string>();

  const toInsert = candidates.filter((candidate) => {
    const emailKey = candidate.email ?? undefined;
    const instaKey = candidate.instagram?.toLowerCase();
    const isDuplicate =
      (emailKey && (existingEmails.has(emailKey) || seenEmails.has(emailKey))) ||
      (instaKey && (existingInstagrams.has(instaKey) || seenInstagrams.has(instaKey)));
    if (isDuplicate) return false;
    if (emailKey) seenEmails.add(emailKey);
    if (instaKey) seenInstagrams.add(instaKey);
    return true;
  });
  const duplicateCount = candidates.length - toInsert.length;

  if (toInsert.length > 0) {
    const statusItem = await getProspectStatusItem(PROSPECT_STATUS.A_FAIRE);
    const importDate = new Date().toLocaleDateString("fr-FR");
    const importLabel = source === "import_google_sheet" ? "Importé depuis Google Sheets le" : "Importé via CSV le";
    await db.prospect.createMany({
      data: toInsert.map((candidate) => ({
        name: candidate.name,
        company: candidate.company,
        address: candidate.address,
        city: candidate.city,
        phone: candidate.phone,
        email: candidate.email,
        instagram: candidate.instagram,
        instagramUrl: candidate.instagramUrl,
        website: candidate.website,
        whatsappUrl: candidate.whatsappUrl,
        activityLevel: candidate.activityLevel,
        notes: [candidate.notes, `${importLabel} ${importDate}.`].filter(Boolean).join(" — "),
        statusId: statusItem.id,
        source,
      })),
    });
  }

  revalidateProspectPaths();

  const parts = [
    `${toInsert.length} prospect${toInsert.length > 1 ? "s" : ""} importé${toInsert.length > 1 ? "s" : ""}`,
  ];
  if (duplicateCount > 0) {
    parts.push(`${duplicateCount} doublon${duplicateCount > 1 ? "s" : ""} ignoré${duplicateCount > 1 ? "s" : ""}`);
  }
  if (skippedNoName > 0) {
    parts.push(`${skippedNoName} ligne${skippedNoName > 1 ? "s" : ""} sans nom ignorée${skippedNoName > 1 ? "s" : ""}`);
  }
  return { message: parts.join(", ") + "." };
}
