// Each cover/item resolves from either an external URL (seeded Picsum
// placeholders) or an uploaded file streamed through the public
// /api/portfolio-media routes — never both (see prisma/schema.prisma).

export function resolveCoverSrc(pillar: {
  id: string;
  coverExternalUrl: string | null;
  coverStorageKey: string | null;
}): string {
  if (pillar.coverStorageKey) return `/api/portfolio-media/covers/${pillar.id}`;
  return pillar.coverExternalUrl ?? "";
}

export function resolveItemSrc(item: {
  id: string;
  externalUrl: string | null;
  storageKey: string | null;
}): string {
  if (item.storageKey) return `/api/portfolio-media/items/${item.id}`;
  return item.externalUrl ?? "";
}

export function computePillarMediaType(
  items: { mediaType: string }[],
): "image" | "video" | "mixed" {
  if (items.length === 0) return "mixed";
  const allImages = items.every((item) => item.mediaType === "image");
  if (allImages) return "image";
  const allVideos = items.every((item) => item.mediaType === "video");
  if (allVideos) return "video";
  return "mixed";
}
