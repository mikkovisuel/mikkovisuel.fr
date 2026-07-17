"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { getStorageAdapter } from "@/lib/storage";
import { slugify } from "@/lib/slugify";
import { computePillarMediaType } from "@/lib/portfolio-media";
import {
  PillarSchema,
  MediaItemSchema,
  type PillarFormState,
  type MediaItemFormState,
} from "@/lib/validation/portfolio";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
// La limite de 50 Mo avait été retirée le 2026-07-17, mais l'upload charge
// actuellement le fichier entier en mémoire (pas de streaming) — sur le
// conteneur de production (~1 Go de RAM), une vidéo de plusieurs centaines
// de Mo fait planter le serveur (OOM kill, confirmé en prod le 2026-07-17).
// 200 Mo reste une limite calibrée pour ne jamais dépasser cette mémoire,
// en attendant un éventuel passage en upload streaming.
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

async function nextPillarSortOrder() {
  const last = await db.portfolioPillar.findFirst({ orderBy: { sortOrder: "desc" } });
  return (last?.sortOrder ?? -1) + 1;
}

async function nextItemSortOrder(pillarId: string) {
  const last = await db.portfolioMediaItem.findFirst({
    where: { pillarId },
    orderBy: { sortOrder: "desc" },
  });
  return (last?.sortOrder ?? -1) + 1;
}

async function recalculatePillarMediaType(pillarId: string) {
  const items = await db.portfolioMediaItem.findMany({
    where: { pillarId },
    select: { mediaType: true },
  });
  await db.portfolioPillar.update({
    where: { id: pillarId },
    data: { mediaType: computePillarMediaType(items) },
  });
}

export async function createPillar(
  _prev: PillarFormState,
  formData: FormData,
): Promise<PillarFormState> {
  await verifyAdminSession();

  const parsed = PillarSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const cover = formData.get("cover");
  if (!(cover instanceof File) || cover.size === 0) {
    return { error: "Une image de couverture est requise." };
  }
  if (cover.size > MAX_IMAGE_SIZE) {
    return { error: "Image trop volumineuse (20 Mo maximum)." };
  }
  if (!ALLOWED_IMAGE_TYPES.has(cover.type)) {
    return { error: "Format d'image non autorisé (PNG, JPEG ou WebP)." };
  }

  const slug = slugify(parsed.data.title);
  const existing = await db.portfolioPillar.findUnique({ where: { slug } });
  if (existing) {
    return { error: "Un pilier avec un titre équivalent existe déjà." };
  }

  const storage = getStorageAdapter();
  const storageKey = `portfolio/covers/${randomUUID()}`;
  await storage.save(storageKey, Buffer.from(await cover.arrayBuffer()));

  const pillar = await db.portfolioPillar.create({
    data: {
      slug,
      title: parsed.data.title,
      description: parsed.data.description,
      sortOrder: await nextPillarSortOrder(),
      coverStorageKey: storageKey,
      coverMimeType: cover.type,
      coverStorageBackend: storage.backend,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/portfolio");
  redirect(`/admin/portfolio/${pillar.id}`);
}

export async function updatePillar(
  pillarId: string,
  _prev: PillarFormState,
  formData: FormData,
): Promise<PillarFormState> {
  await verifyAdminSession();

  const parsed = PillarSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const pillar = await db.portfolioPillar.findUnique({ where: { id: pillarId } });
  if (!pillar) return { error: "Pilier introuvable." };

  const cover = formData.get("cover");
  const data: {
    title: string;
    description: string;
    coverStorageKey?: string;
    coverMimeType?: string;
    coverStorageBackend?: string;
    coverExternalUrl?: null;
  } = { title: parsed.data.title, description: parsed.data.description };

  if (cover instanceof File && cover.size > 0) {
    if (cover.size > MAX_IMAGE_SIZE) {
      return { error: "Image trop volumineuse (20 Mo maximum)." };
    }
    if (!ALLOWED_IMAGE_TYPES.has(cover.type)) {
      return { error: "Format d'image non autorisé (PNG, JPEG ou WebP)." };
    }

    const storage = getStorageAdapter();
    const storageKey = `portfolio/covers/${randomUUID()}`;
    await storage.save(storageKey, Buffer.from(await cover.arrayBuffer()));

    if (pillar.coverStorageKey) {
      await storage.delete(pillar.coverStorageKey).catch(() => {});
    }

    data.coverStorageKey = storageKey;
    data.coverMimeType = cover.type;
    data.coverStorageBackend = storage.backend;
    data.coverExternalUrl = null;
  }

  await db.portfolioPillar.update({ where: { id: pillarId }, data });

  revalidatePath("/");
  revalidatePath(`/portfolio/${pillar.slug}`);
  revalidatePath(`/admin/portfolio/${pillarId}`);
  revalidatePath("/admin/portfolio");
  return undefined;
}

export async function deletePillar(pillarId: string) {
  await verifyAdminSession();

  const pillar = await db.portfolioPillar.findUnique({
    where: { id: pillarId },
    include: { items: true },
  });
  if (!pillar) return;

  const storage = getStorageAdapter();
  if (pillar.coverStorageKey) {
    await storage.delete(pillar.coverStorageKey).catch(() => {});
  }
  for (const item of pillar.items) {
    if (item.storageKey) {
      await storage.delete(item.storageKey).catch(() => {});
    }
  }

  await db.portfolioPillar.delete({ where: { id: pillarId } });

  revalidatePath("/");
  revalidatePath("/admin/portfolio");
  redirect("/admin/portfolio");
}

export async function movePillar(pillarId: string, direction: "up" | "down") {
  await verifyAdminSession();

  const pillars = await db.portfolioPillar.findMany({ orderBy: { sortOrder: "asc" } });
  const index = pillars.findIndex((pillar) => pillar.id === pillarId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= pillars.length) return;

  const current = pillars[index];
  const swapWith = pillars[swapIndex];

  await db.$transaction([
    db.portfolioPillar.update({ where: { id: current.id }, data: { sortOrder: swapWith.sortOrder } }),
    db.portfolioPillar.update({ where: { id: swapWith.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  revalidatePath("/");
  revalidatePath("/admin/portfolio");
}

export async function createMediaItem(
  pillarId: string,
  _prev: MediaItemFormState,
  formData: FormData,
): Promise<MediaItemFormState> {
  await verifyAdminSession();

  const parsed = MediaItemSchema.safeParse({
    title: formData.get("title"),
    aspectRatio: formData.get("aspectRatio"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier." };
  }

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (isVideo) {
    if (file.size > MAX_VIDEO_SIZE) return { error: "Vidéo trop volumineuse (200 Mo maximum)." };
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      return { error: "Format vidéo non autorisé (MP4, WebM ou MOV)." };
    }
  } else if (isImage) {
    if (file.size > MAX_IMAGE_SIZE) return { error: "Image trop volumineuse (20 Mo maximum)." };
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { error: "Format d'image non autorisé (PNG, JPEG ou WebP)." };
    }
  } else {
    return { error: "Type de fichier non autorisé." };
  }

  // Videos are always 9:16, regardless of what the form submitted.
  const aspectRatio = isVideo ? "9:16" : parsed.data.aspectRatio;

  const pillar = await db.portfolioPillar.findUnique({ where: { id: pillarId } });
  if (!pillar) return { error: "Pilier introuvable." };

  const storage = getStorageAdapter();
  const storageKey = `portfolio/items/${randomUUID()}`;
  await storage.save(storageKey, Buffer.from(await file.arrayBuffer()));

  await db.portfolioMediaItem.create({
    data: {
      pillarId,
      title: parsed.data.title,
      mediaType: isVideo ? "video" : "image",
      aspectRatio,
      storageKey,
      mimeType: file.type,
      storageBackend: storage.backend,
      sizeBytes: file.size,
      sortOrder: await nextItemSortOrder(pillarId),
    },
  });

  await recalculatePillarMediaType(pillarId);

  revalidatePath("/");
  revalidatePath(`/portfolio/${pillar.slug}`);
  revalidatePath(`/admin/portfolio/${pillarId}`);
  return undefined;
}

export async function deleteMediaItem(itemId: string, pillarId: string) {
  await verifyAdminSession();

  const item = await db.portfolioMediaItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  if (item.storageKey) {
    const storage = getStorageAdapter();
    await storage.delete(item.storageKey).catch(() => {});
  }

  await db.portfolioMediaItem.delete({ where: { id: itemId } });
  await recalculatePillarMediaType(pillarId);

  const pillar = await db.portfolioPillar.findUnique({ where: { id: pillarId } });

  revalidatePath("/");
  if (pillar) revalidatePath(`/portfolio/${pillar.slug}`);
  revalidatePath(`/admin/portfolio/${pillarId}`);
}

export async function moveMediaItem(pillarId: string, itemId: string, direction: "up" | "down") {
  await verifyAdminSession();

  const items = await db.portfolioMediaItem.findMany({
    where: { pillarId },
    orderBy: { sortOrder: "asc" },
  });
  const index = items.findIndex((item) => item.id === itemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swapWith = items[swapIndex];

  await db.$transaction([
    db.portfolioMediaItem.update({ where: { id: current.id }, data: { sortOrder: swapWith.sortOrder } }),
    db.portfolioMediaItem.update({ where: { id: swapWith.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  const pillar = await db.portfolioPillar.findUnique({ where: { id: pillarId } });
  revalidatePath("/");
  if (pillar) revalidatePath(`/portfolio/${pillar.slug}`);
  revalidatePath(`/admin/portfolio/${pillarId}`);
}
