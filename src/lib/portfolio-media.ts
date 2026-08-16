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

// Vignette d'une galerie (page pilier, façon Adobe Portfolio) : pas de champ
// de couverture dédié sur `PortfolioGallery` — on réutilise son premier
// média (voir prisma/schema.prisma) pour ne pas imposer un upload de plus.
// `null` quand la galerie est encore vide (pilier fraîchement créé) : à
// l'appelant de prévoir un état vide plutôt que d'afficher une image cassée.
export function resolveGalleryCoverSrc(gallery: {
  items: { id: string; externalUrl: string | null; storageKey: string | null }[];
}): string | null {
  const first = gallery.items[0];
  return first ? resolveItemSrc(first) : null;
}
