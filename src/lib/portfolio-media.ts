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

// Vignette d'une galerie (page pilier, façon Adobe Portfolio). Couverture
// dédiée facultative (ajoutée le 2026-08-17) prioritaire quand elle est
// renseignée ; à défaut, on retombe sur le premier média de la galerie
// (comportement d'origine, pour ne jamais imposer un upload de plus quand
// la galerie a déjà ses propres visuels). `null` seulement quand ni l'un ni
// l'autre n'existe (galerie fraîchement créée, encore vide) : à l'appelant
// de prévoir un état vide plutôt que d'afficher une image cassée.
export function resolveGalleryCoverSrc(gallery: {
  id: string;
  coverStorageKey?: string | null;
  items: { id: string; externalUrl: string | null; storageKey: string | null }[];
}): string | null {
  if (gallery.coverStorageKey) return `/api/portfolio-media/gallery-covers/${gallery.id}`;
  const first = gallery.items[0];
  return first ? resolveItemSrc(first) : null;
}
