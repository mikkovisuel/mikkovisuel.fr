"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { getStorageAdapter } from "@/lib/storage";
import { contentMatchesDeclaredType } from "@/lib/file-signature";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import { COMPANY_DOCUMENT_CATEGORY, DOCUMENT_TYPE } from "@/lib/dropdown-lists";
import { formatAmount } from "@/lib/documents";

// Édition des éléments de la page Administratif (demande du 2026-10-20 :
// « pouvoir corriger si je me suis trompé ») — factures/devis/contrats,
// paiements sans facture, documents de la société. Mêmes contrôles que la
// création (`uploadDocument`, `createPaymentRecord`, `uploadCompanyDocument`).
//
// Arbitrage du client : un document « engagé » (devis signé par le client,
// facture payée en ligne) reste modifiable, mais le formulaire doit d'abord
// renvoyer un avertissement, puis être renvoyé avec la confirmation. Toute
// modification est inscrite au journal d'audit avec l'avant/après.
//
// Aucun e-mail n'est envoyé au client : c'est une correction, pas un nouveau
// document.

export type EditState =
  | { error?: string; warning?: string; done?: boolean }
  | undefined;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_NAME_LENGTH = 200;

/** Nom affiché d'un fichier : l'extension d'origine est conservée si le
 * nouveau nom n'en porte pas (sinon le téléchargement perdrait son type). */
function cleanFileName(raw: FormDataEntryValue | null, previous: string): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim();
  if (!name || name.length > MAX_NAME_LENGTH) return null;
  const extension = previous.match(/\.[a-z0-9]{2,5}$/i)?.[0];
  if (extension && !/\.[a-z0-9]{2,5}$/i.test(name)) return name + extension;
  return name;
}

function parseAmountCents(raw: FormDataEntryValue | null): number | null | "invalid" {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (Number.isNaN(value) || value < 0) return "invalid";
  return Math.round(value * 100);
}

/** Fichier de remplacement facultatif. `null` = pas de remplacement. */
async function readReplacement(
  formData: FormData,
  allowedTypes: Set<string>,
  typeError: string,
): Promise<{ file: File; buffer: Buffer } | null | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_FILE_SIZE) return { error: "Fichier trop volumineux (20 Mo maximum)." };
  if (!allowedTypes.has(file.type)) return { error: typeError };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!(await contentMatchesDeclaredType(buffer, file.type))) {
    return { error: "Le contenu du fichier ne correspond pas au format déclaré." };
  }
  return { file, buffer };
}

const dateOnly = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/** Liste des champs changés, pour le journal d'audit : `{ champ: [avant, après] }`. */
function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changes[key] = [before[key], after[key]];
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Factures, devis, contrats
// ---------------------------------------------------------------------------

export async function updateDocument(documentId: string, _prev: EditState, formData: FormData): Promise<EditState> {
  const admin = await verifyAdminSession();

  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { type: true, client: { select: { name: true } } },
  });
  if (!document) return { error: "Document introuvable — il a peut-être été supprimé." };

  const typeId = formData.get("typeId");
  const clientId = formData.get("clientId");
  if (typeof typeId !== "string" || !typeId) return { error: "Choisissez un type de document." };
  if (typeof clientId !== "string" || !clientId) return { error: "Choisissez un client." };

  const [docType, client] = await Promise.all([
    db.dropdownItem.findUnique({ where: { id: typeId } }),
    db.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } }),
  ]);
  if (!docType) return { error: "Type de document invalide." };
  if (!client) return { error: "Client introuvable." };

  const fileName = cleanFileName(formData.get("fileName"), document.fileName);
  if (!fileName) return { error: `Indiquez un nom de fichier (${MAX_NAME_LENGTH} caractères au plus).` };

  const amountCents = parseAmountCents(formData.get("amountEuros"));
  if (amountCents === "invalid") return { error: "Montant invalide." };

  const dueDateRaw = formData.get("dueDate");
  const dueDate = typeof dueDateRaw === "string" && dueDateRaw ? new Date(dueDateRaw) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return { error: "Date d'échéance invalide." };

  const isMonthlyInvoice = formData.get("isMonthlyInvoice") === "on";
  let invoiceYear: number | null = null;
  let invoiceMonth: number | null = null;
  if (isMonthlyInvoice) {
    invoiceYear = Number.parseInt(String(formData.get("invoiceYear") ?? ""), 10);
    invoiceMonth = Number.parseInt(String(formData.get("invoiceMonth") ?? ""), 10);
    if (!invoiceYear || !invoiceMonth || invoiceMonth < 1 || invoiceMonth > 12) {
      return { error: "Choisissez l'année et le mois de la facture mensuelle." };
    }
  }

  const replacement = await readReplacement(
    formData,
    new Set(["application/pdf"]),
    "Seuls les fichiers PDF sont acceptés.",
  );
  if (replacement && "error" in replacement) return { error: replacement.error };

  // Statut de paiement : on garde celui du document, sauf quand le montant
  // apparaît (→ « à payer ») ou disparaît (→ « sans objet »).
  const paymentStatus =
    amountCents === null ? "n/a" : document.paymentStatus === "n/a" ? "unpaid" : document.paymentStatus;

  // Document engagé : demander confirmation avant d'enregistrer.
  const signedQuote = document.type.slug === DOCUMENT_TYPE.DEVIS && document.acceptedAt !== null;
  const paidOnline =
    document.paymentStatus === "paid" && Boolean(document.stripeCheckoutSessionId || document.paypalOrderId);
  if ((signedQuote || paidOnline) && formData.get("confirmEngaged") !== "1") {
    return {
      warning: signedQuote
        ? "Ce devis a été accepté et signé par le client. Le modifier change le document qu'il a signé : la modification sera inscrite dans l'Audit."
        : "Cette facture a été payée en ligne par le client. La modifier ne change pas ce qui a été payé : la modification sera inscrite dans l'Audit.",
    };
  }

  const before = {
    fichier: document.fileName,
    client: document.client.name,
    type: document.type.label,
    montant: document.amountCents,
    echeance: dateOnly(document.dueDate),
    mensuelle: document.isMonthlyInvoice ? `${document.invoiceMonth}/${document.invoiceYear}` : null,
  };
  const after = {
    fichier: fileName,
    client: client.name,
    type: docType.label,
    montant: amountCents,
    echeance: dateOnly(dueDate),
    mensuelle: isMonthlyInvoice ? `${invoiceMonth}/${invoiceYear}` : null,
  };

  const storage = getStorageAdapter();
  let newStorage: { storageKey: string; mimeType: string; sizeBytes: number; storageBackend: string } | null = null;
  if (replacement) {
    const storageKey = `documents/${randomUUID()}`;
    await storage.save(storageKey, replacement.buffer);
    newStorage = {
      storageKey,
      mimeType: replacement.file.type,
      sizeBytes: replacement.file.size,
      storageBackend: storage.backend,
    };
  }

  await db.document.update({
    where: { id: documentId },
    data: {
      typeId,
      clientId,
      fileName,
      amountCents,
      paymentStatus,
      // Un paiement ne reste daté que s'il est toujours payé.
      ...(paymentStatus !== "paid" ? { paidAt: null } : {}),
      dueDate,
      isMonthlyInvoice,
      invoiceYear,
      invoiceMonth,
      ...(newStorage ?? {}),
    },
  });
  // L'ancien fichier n'est effacé qu'une fois la base à jour : en cas d'échec
  // au milieu, le document pointe toujours vers un fichier existant.
  if (newStorage) await storage.delete(document.storageKey).catch(() => {});

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "document_updated",
    targetType: "Document",
    targetId: documentId,
    targetLabel: `${fileName} — ${client.name}`,
    metadata: {
      changes: diff(before, after),
      fichierRemplace: Boolean(newStorage),
      ...(signedQuote ? { engage: "devis signé" } : paidOnline ? { engage: "payée en ligne" } : {}),
    },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/admin/clients/${document.clientId}`);
  if (clientId !== document.clientId) revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/administratif");
  revalidatePath("/espace-client");
  revalidatePath("/espace-client/administratif");
  return { done: true };
}

// ---------------------------------------------------------------------------
// Paiements sans facture
// ---------------------------------------------------------------------------

export async function updatePaymentRecord(recordId: string, _prev: EditState, formData: FormData): Promise<EditState> {
  const admin = await verifyAdminSession();

  const record = await db.paymentRecord.findUnique({
    where: { id: recordId },
    include: { client: { select: { name: true } } },
  });
  if (!record) return { error: "Paiement introuvable — il a peut-être été supprimé." };

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) return { error: "Choisissez un client." };
  const client = await db.client.findUnique({ where: { id: clientId }, select: { name: true } });
  if (!client) return { error: "Client introuvable." };

  const amountCents = parseAmountCents(formData.get("amountEuros"));
  if (amountCents === "invalid" || amountCents === null || amountCents === 0) {
    return { error: "Indiquez un montant supérieur à zéro." };
  }

  const labelRaw = formData.get("label");
  const label = typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim().slice(0, 200) : null;

  const dateRaw = formData.get("date");
  const date = typeof dateRaw === "string" && dateRaw ? new Date(dateRaw) : null;
  if (!date || Number.isNaN(date.getTime())) return { error: "Date invalide." };

  await db.paymentRecord.update({
    where: { id: recordId },
    data: { clientId, label, amountCents, date },
  });

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "payment_record_updated",
    targetType: "PaymentRecord",
    targetId: recordId,
    targetLabel: `${formatAmount(amountCents, record.currency)} — ${client.name}`,
    metadata: {
      changes: diff(
        { client: record.client.name, libelle: record.label, montant: record.amountCents, date: dateOnly(record.date) },
        { client: client.name, libelle: label, montant: amountCents, date: dateOnly(date) },
      ),
    },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/administratif");
  revalidatePath(`/admin/clients/${record.clientId}`);
  if (clientId !== record.clientId) revalidatePath(`/admin/clients/${clientId}`);
  return { done: true };
}

// ---------------------------------------------------------------------------
// Documents de la société (sans client)
// ---------------------------------------------------------------------------

export async function updateCompanyDocument(
  documentId: string,
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  const admin = await verifyAdminSession();

  const document = await db.companyDocument.findUnique({ where: { id: documentId } });
  if (!document) return { error: "Document introuvable — il a peut-être été supprimé." };

  const category = formData.get("category");
  if (typeof category !== "string" || !(Object.values(COMPANY_DOCUMENT_CATEGORY) as string[]).includes(category)) {
    return { error: "Catégorie invalide." };
  }

  const fileName = cleanFileName(formData.get("fileName"), document.fileName);
  if (!fileName) return { error: `Indiquez un nom de fichier (${MAX_NAME_LENGTH} caractères au plus).` };

  const replacement = await readReplacement(
    formData,
    new Set(["application/pdf", "image/png", "image/jpeg"]),
    "Format non autorisé (PDF, JPEG ou PNG).",
  );
  if (replacement && "error" in replacement) return { error: replacement.error };

  const storage = getStorageAdapter();
  let newStorage: { storageKey: string; mimeType: string; sizeBytes: number; storageBackend: string } | null = null;
  if (replacement) {
    const storageKey = `company-documents/${randomUUID()}`;
    await storage.save(storageKey, replacement.buffer);
    newStorage = {
      storageKey,
      mimeType: replacement.file.type,
      sizeBytes: replacement.file.size,
      storageBackend: storage.backend,
    };
  }

  await db.companyDocument.update({
    where: { id: documentId },
    data: { category, fileName, ...(newStorage ?? {}) },
  });
  if (newStorage) await storage.delete(document.storageKey).catch(() => {});

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "company_document_updated",
    targetType: "CompanyDocument",
    targetId: documentId,
    targetLabel: fileName,
    metadata: {
      changes: diff({ fichier: document.fileName, categorie: document.category }, { fichier: fileName, categorie: category }),
      fichierRemplace: Boolean(newStorage),
    },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/administratif");
  return { done: true };
}
