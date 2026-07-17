// Fallback to the original hardcoded Picsum placeholders (see git history of
// hero-visual.tsx) when the admin hasn't uploaded a real photo yet.
const DEFAULT_MAIN_SRC = "https://picsum.photos/seed/mikko-hero-main/1200/900";
const DEFAULT_DETAIL_SRC = "https://picsum.photos/seed/mikko-hero-detail/600/800";

export function resolveHeroMainSrc(hero: { mainStorageKey: string | null } | null): string {
  if (hero?.mainStorageKey) return "/api/homepage-hero/main";
  return DEFAULT_MAIN_SRC;
}

export function resolveHeroDetailSrc(hero: { detailStorageKey: string | null } | null): string {
  if (hero?.detailStorageKey) return "/api/homepage-hero/detail";
  return DEFAULT_DETAIL_SRC;
}
