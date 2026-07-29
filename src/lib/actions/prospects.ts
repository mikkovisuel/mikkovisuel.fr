"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
    phone: formData.get("phone"),
    email: formData.get("email"),
    instagram: formData.get("instagram"),
    website: formData.get("website"),
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
      phone: parsed.data.phone || null,
      email: parsed.data.email,
      instagram: parsed.data.instagram || null,
      website: parsed.data.website || null,
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
      phone: parsed.data.phone || null,
      email: parsed.data.email,
      instagram: parsed.data.instagram || null,
      website: parsed.data.website || null,
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

  // Pas de compte de connexion créé si le prospect n'a pas d'email, ou si un
  // compte existe déjà avec cet email (ex. prospect issu d'un client déjà
  // présent) — signalé à l'admin via un paramètre d'URL plutôt qu'un état de
  // formulaire, puisque cette action se termine par un redirect.
  let noLoginReason: "no-email" | "email-taken" | null = prospect.email ? null : "no-email";
  if (prospect.email) {
    const existingUser = await db.clientUser.findUnique({ where: { email: prospect.email } });
    if (existingUser) {
      noLoginReason = "email-taken";
    } else {
      const randomPassword = randomBytes(24).toString("hex");
      const clientUser = await db.clientUser.create({
        data: {
          clientId: client.id,
          name: prospect.name,
          email: prospect.email,
          passwordHash: await hashPassword(randomPassword),
          phone: prospect.phone,
        },
      });
      await sendClientPasswordResetEmail(clientUser);
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
        phone: prospect.phone,
        email: prospect.email,
        instagram: prospect.instagram,
        website: prospect.website,
        notes: searchNote,
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
const COLUMN_SYNONYMS: Record<string, string[]> = {
  name: ["nom", "name"],
  company: ["entreprise", "societe", "company", "activite"],
  address: ["adresse", "address"],
  phone: ["telephone", "tel", "phone"],
  email: ["email", "mail", "e-mail"],
  instagram: ["instagram", "insta"],
  website: ["siteweb", "site web", "siteinternet", "site internet", "website", "site"],
  notes: ["notes", "note", "commentaire", "commentaires"],
};

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
    phone: string | null;
    email: string | null;
    instagram: string | null;
    website: string | null;
    notes: string | null;
  }[] = [];

  for (const row of dataRows) {
    if (row.every((cell) => cell.trim() === "")) continue;
    const name = getCell(row, columnIndex, "name");
    if (!name) {
      skippedNoName++;
      continue;
    }
    const email = getCell(row, columnIndex, "email");
    candidates.push({
      name,
      company: getCell(row, columnIndex, "company"),
      address: getCell(row, columnIndex, "address"),
      phone: getCell(row, columnIndex, "phone"),
      email: email ? email.toLowerCase() : null,
      instagram: getCell(row, columnIndex, "instagram"),
      website: getCell(row, columnIndex, "website"),
      notes: getCell(row, columnIndex, "notes"),
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
    await db.prospect.createMany({
      data: toInsert.map((candidate) => ({
        name: candidate.name,
        company: candidate.company,
        address: candidate.address,
        phone: candidate.phone,
        email: candidate.email,
        instagram: candidate.instagram,
        website: candidate.website,
        notes: [candidate.notes, `Importé via CSV le ${importDate}.`].filter(Boolean).join(" — "),
        statusId: statusItem.id,
        source: "import_csv",
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
