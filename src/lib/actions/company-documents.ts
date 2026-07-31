"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { getStorageAdapter } from "@/lib/storage";
import { contentMatchesDeclaredType } from "@/lib/file-signature";
import { COMPANY_DOCUMENT_CATEGORY, type CompanyDocumentCategory } from "@/lib/dropdown-lists";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export type CompanyDocumentUploadState = { error?: string } | undefined;

// Documents Commercial/Société (ajoutés le 2026-07-31) — pas de client
// associé, consultation/téléchargement/suppression uniquement. Même
// vérification de signature binaire que les autres envois du projet (un
// fichier renommé en `.pdf` ne passe pas).
export async function uploadCompanyDocument(
  _prev: CompanyDocumentUploadState,
  formData: FormData,
): Promise<CompanyDocumentUploadState> {
  await verifyAdminSession();

  const file = formData.get("file");
  const category = formData.get("category");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Fichier trop volumineux (20 Mo maximum)." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Format non autorisé (PDF, JPEG ou PNG)." };
  }
  if (
    typeof category !== "string" ||
    !(Object.values(COMPANY_DOCUMENT_CATEGORY) as string[]).includes(category)
  ) {
    return { error: "Catégorie invalide." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!(await contentMatchesDeclaredType(buffer, file.type))) {
    return { error: "Le contenu du fichier ne correspond pas au format déclaré." };
  }

  const storage = getStorageAdapter();
  const storageKey = `company-documents/${randomUUID()}`;
  await storage.save(storageKey, buffer);

  await db.companyDocument.create({
    data: {
      category: category as CompanyDocumentCategory,
      fileName: file.name,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      storageBackend: storage.backend,
    },
  });

  revalidatePath("/admin/documents");
  return undefined;
}

export async function deleteCompanyDocument(documentId: string) {
  await verifyAdminSession();

  const document = await db.companyDocument.findUnique({ where: { id: documentId } });
  if (!document) return;

  await getStorageAdapter().delete(document.storageKey);
  await db.companyDocument.delete({ where: { id: documentId } });

  revalidatePath("/admin/documents");
}
