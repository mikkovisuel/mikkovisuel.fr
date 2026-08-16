"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { getStorageAdapter } from "@/lib/storage";
import { slugify } from "@/lib/slugify";
import { contentMatchesDeclaredType } from "@/lib/file-signature";
import {
  PillarSchema,
  GallerySchema,
  MediaItemSchema,
  type PillarFormState,
  type GalleryFormState,
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

async function nextGallerySortOrder(pillarId: string) {
  const last = await db.portfolioGallery.findFirst({
    where: { pillarId },
    orderBy: { sortOrder: "desc" },
  });
  return (last?.sortOrder ?? -1) + 1;
}

async function nextItemSortOrder(galleryId: string) {
  const last = await db.portfolioMediaItem.findFirst({
    where: { galleryId },
    orderBy: { sortOrder: "desc" },
  });
  return (last?.sortOrder ?? -1) + 1;
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
  const coverBuffer = Buffer.from(await cover.arrayBuffer());
  if (!(await contentMatchesDeclaredType(coverBuffer, cover.type))) {
    return { error: "Le contenu du fichier ne correspond pas à une image valide." };
  }

  const slug = slugify(parsed.data.title);
  const existing = await db.portfolioPillar.findUnique({ where: { slug } });
  if (existing) {
    return { error: "Un pilier avec un titre équivalent existe déjà." };
  }

  const storage = getStorageAdapter();
  const storageKey = `portfolio/covers/${randomUUID()}`;
  await storage.save(storageKey, coverBuffer);

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
    const coverBuffer = Buffer.from(await cover.arrayBuffer());
    if (!(await contentMatchesDeclaredType(coverBuffer, cover.type))) {
      return { error: "Le contenu du fichier ne correspond pas à une image valide." };
    }

    const storage = getStorageAdapter();
    const storageKey = `portfolio/covers/${randomUUID()}`;
    await storage.save(storageKey, coverBuffer);

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
  return { success: true };
}

export async function deletePillar(pillarId: string) {
  await verifyAdminSession();

  const pillar = await db.portfolioPillar.findUnique({
    where: { id: pillarId },
    include: { galleries: { include: { items: true } } },
  });
  if (!pillar) return;

  const storage = getStorageAdapter();
  if (pillar.coverStorageKey) {
    await storage.delete(pillar.coverStorageKey).catch(() => {});
  }
  for (const gallery of pillar.galleries) {
    for (const item of gallery.items) {
      if (item.storageKey) {
        await storage.delete(item.storageKey).catch(() => {});
      }
    }
  }

  await db.portfolioPillar.delete({ where: { id: pillarId } });

  revalidatePath("/");
  revalidatePath("/admin/portfolio");
  redirect("/admin/portfolio");
}

// --- Galeries (demande du 2026-08-16) --------------------------------

export async function createGallery(
  pillarId: string,
  _prev: GalleryFormState,
  formData: FormData,
): Promise<GalleryFormState> {
  await verifyAdminSession();

  const parsed = GallerySchema.safeParse({
    title: formData.get("title"),
    textBefore: formData.get("textBefore"),
    textAfter: formData.get("textAfter"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const pillar = await db.portfolioPillar.findUnique({ where: { id: pillarId } });
  if (!pillar) return { error: "Pilier introuvable." };

  const gallery = await db.portfolioGallery.create({
    data: {
      pillarId,
      title: parsed.data.title,
      textBefore: parsed.data.textBefore || null,
      textAfter: parsed.data.textAfter || null,
      sortOrder: await nextGallerySortOrder(pillarId),
    },
  });

  revalidatePath("/");
  revalidatePath(`/portfolio/${pillar.slug}`);
  revalidatePath(`/admin/portfolio/${pillarId}`);
  redirect(`/admin/portfolio/${pillarId}/${gallery.id}`);
}

export async function updateGallery(
  galleryId: string,
  _prev: GalleryFormState,
  formData: FormData,
): Promise<GalleryFormState> {
  await verifyAdminSession();

  const parsed = GallerySchema.safeParse({
    title: formData.get("title"),
    textBefore: formData.get("textBefore"),
    textAfter: formData.get("textAfter"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const gallery = await db.portfolioGallery.findUnique({
    where: { id: galleryId },
    include: { pillar: true },
  });
  if (!gallery) return { error: "Galerie introuvable." };

  await db.portfolioGallery.update({
    where: { id: galleryId },
    data: {
      title: parsed.data.title,
      textBefore: parsed.data.textBefore || null,
      textAfter: parsed.data.textAfter || null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/portfolio/${gallery.pillar.slug}`);
  revalidatePath(`/portfolio/${gallery.pillar.slug}/${galleryId}`);
  revalidatePath(`/admin/portfolio/${gallery.pillarId}`);
  revalidatePath(`/admin/portfolio/${gallery.pillarId}/${galleryId}`);
  return { success: true };
}

export async function deleteGallery(galleryId: string, pillarId: string) {
  await verifyAdminSession();

  const gallery = await db.portfolioGallery.findUnique({
    where: { id: galleryId },
    include: { items: true, pillar: true },
  });
  if (!gallery) return;

  const storage = getStorageAdapter();
  for (const item of gallery.items) {
    if (item.storageKey) {
      await storage.delete(item.storageKey).catch(() => {});
    }
  }

  await db.portfolioGallery.delete({ where: { id: galleryId } });

  revalidatePath("/");
  revalidatePath(`/portfolio/${gallery.pillar.slug}`);
  revalidatePath(`/admin/portfolio/${pillarId}`);
  redirect(`/admin/portfolio/${pillarId}`);
}

export async function moveGallery(pillarId: string, galleryId: string, direction: "up" | "down") {
  await verifyAdminSession();

  const galleries = await db.portfolioGallery.findMany({
    where: { pillarId },
    orderBy: { sortOrder: "asc" },
  });
  const index = galleries.findIndex((gallery) => gallery.id === galleryId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= galleries.length) return;

  const current = galleries[index];
  const swapWith = galleries[swapIndex];

  await db.$transaction([
    db.portfolioGallery.update({ where: { id: current.id }, data: { sortOrder: swapWith.sortOrder } }),
    db.portfolioGallery.update({ where: { id: swapWith.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  const pillar = await db.portfolioPillar.findUnique({ where: { id: pillarId } });
  revalidatePath("/");
  if (pillar) revalidatePath(`/portfolio/${pillar.slug}`);
  revalidatePath(`/admin/portfolio/${pillarId}`);
}

// --- Médias (photos/vidéos) au sein d'une galerie ----------------------

export async function createMediaItem(
  galleryId: string,
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

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (isImage && !(await contentMatchesDeclaredType(fileBuffer, file.type))) {
    return { error: "Le contenu du fichier ne correspond pas à une image valide." };
  }

  // Videos are always 9:16, regardless of what the form submitted.
  const aspectRatio = isVideo ? "9:16" : parsed.data.aspectRatio;

  const gallery = await db.portfolioGallery.findUnique({
    where: { id: galleryId },
    include: { pillar: true },
  });
  if (!gallery) return { error: "Galerie introuvable." };

  const storage = getStorageAdapter();
  const storageKey = `portfolio/items/${randomUUID()}`;
  await storage.save(storageKey, fileBuffer);

  await db.portfolioMediaItem.create({
    data: {
      galleryId,
      title: parsed.data.title,
      mediaType: isVideo ? "video" : "image",
      aspectRatio,
      storageKey,
      mimeType: file.type,
      storageBackend: storage.backend,
      sizeBytes: file.size,
      sortOrder: await nextItemSortOrder(galleryId),
    },
  });

  revalidatePath("/");
  revalidatePath(`/portfolio/${gallery.pillar.slug}`);
  revalidatePath(`/portfolio/${gallery.pillar.slug}/${galleryId}`);
  revalidatePath(`/admin/portfolio/${gallery.pillarId}/${galleryId}`);
  return undefined;
}

export async function deleteMediaItem(itemId: string, galleryId: string) {
  await verifyAdminSession();

  const item = await db.portfolioMediaItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  if (item.storageKey) {
    const storage = getStorageAdapter();
    await storage.delete(item.storageKey).catch(() => {});
  }

  await db.portfolioMediaItem.delete({ where: { id: itemId } });

  const gallery = await db.portfolioGallery.findUnique({
    where: { id: galleryId },
    include: { pillar: true },
  });

  revalidatePath("/");
  if (gallery) {
    revalidatePath(`/portfolio/${gallery.pillar.slug}`);
    revalidatePath(`/portfolio/${gallery.pillar.slug}/${galleryId}`);
    revalidatePath(`/admin/portfolio/${gallery.pillarId}/${galleryId}`);
  }
}

export async function moveMediaItem(galleryId: string, itemId: string, direction: "up" | "down") {
  await verifyAdminSession();

  const items = await db.portfolioMediaItem.findMany({
    where: { galleryId },
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

  const gallery = await db.portfolioGallery.findUnique({
    where: { id: galleryId },
    include: { pillar: true },
  });
  revalidatePath("/");
  if (gallery) {
    revalidatePath(`/portfolio/${gallery.pillar.slug}`);
    revalidatePath(`/portfolio/${gallery.pillar.slug}/${galleryId}`);
    revalidatePath(`/admin/portfolio/${gallery.pillarId}/${galleryId}`);
  }
}
