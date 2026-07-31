"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { getStorageAdapter } from "@/lib/storage";
import { contentMatchesDeclaredType } from "@/lib/file-signature";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const HERO_ID = "hero";

export type HomepageHeroFormState = { error?: string; success?: boolean } | undefined;

export async function updateHomepageHero(
  _prev: HomepageHeroFormState,
  formData: FormData,
): Promise<HomepageHeroFormState> {
  await verifyAdminSession();

  const main = formData.get("main");
  const detail = formData.get("detail");
  const mainFile = main instanceof File && main.size > 0 ? main : null;
  const detailFile = detail instanceof File && detail.size > 0 ? detail : null;

  if (!mainFile && !detailFile) {
    return { error: "Choisissez au moins une image." };
  }
  const buffers = new Map<File, Buffer>();
  for (const file of [mainFile, detailFile]) {
    if (!file) continue;
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: `"${file.name}" est trop volumineux (20 Mo maximum).` };
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { error: `"${file.name}" : format non autorisé (PNG, JPEG ou WebP).` };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!(await contentMatchesDeclaredType(buffer, file.type))) {
      return { error: `"${file.name}" : le contenu du fichier ne correspond pas à une image valide.` };
    }
    buffers.set(file, buffer);
  }

  const storage = getStorageAdapter();
  const existing = await db.homepageHero.findUnique({ where: { id: HERO_ID } });

  const data: {
    mainStorageKey?: string;
    mainMimeType?: string;
    mainStorageBackend?: string;
    detailStorageKey?: string;
    detailMimeType?: string;
    detailStorageBackend?: string;
  } = {};

  if (mainFile) {
    const storageKey = `homepage-hero/${randomUUID()}`;
    await storage.save(storageKey, buffers.get(mainFile)!);
    if (existing?.mainStorageKey) await storage.delete(existing.mainStorageKey);
    data.mainStorageKey = storageKey;
    data.mainMimeType = mainFile.type;
    data.mainStorageBackend = storage.backend;
  }
  if (detailFile) {
    const storageKey = `homepage-hero/${randomUUID()}`;
    await storage.save(storageKey, buffers.get(detailFile)!);
    if (existing?.detailStorageKey) await storage.delete(existing.detailStorageKey);
    data.detailStorageKey = storageKey;
    data.detailMimeType = detailFile.type;
    data.detailStorageBackend = storage.backend;
  }

  await db.homepageHero.upsert({
    where: { id: HERO_ID },
    create: { id: HERO_ID, ...data },
    update: data,
  });

  revalidatePath("/");
  revalidatePath("/admin/portfolio");
  return { success: true };
}
