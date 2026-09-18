import "server-only";
import { db } from "@/lib/db";
import { SOCIAL_CATEGORY_LIST_KEY, TASK_TYPE_LIST_KEY } from "@/lib/dropdown-lists";
import type { SocialClientLibrary } from "@/components/admin/social-post-form";

// Réglages réseaux (ligne éditoriale, hashtags, modèles) des clients donnés,
// au format attendu par le formulaire de publication.
export async function loadSocialLibraries(clientIds: string[]): Promise<Record<string, SocialClientLibrary>> {
  if (clientIds.length === 0) return {};
  const [profiles, items] = await Promise.all([
    db.socialClientProfile.findMany({ where: { clientId: { in: clientIds } } }),
    db.socialLibraryItem.findMany({ where: { clientId: { in: clientIds } }, orderBy: { createdAt: "asc" } }),
  ]);
  const libraries: Record<string, SocialClientLibrary> = {};
  const libraryOf = (clientId: string) =>
    (libraries[clientId] ??= { editorialLine: null, brandTone: null, hashtagSets: [], templates: [] });
  for (const profile of profiles) {
    Object.assign(libraryOf(profile.clientId), { editorialLine: profile.editorialLine, brandTone: profile.brandTone });
  }
  for (const item of items) {
    const entry = { id: item.id, name: item.name, content: item.content };
    if (item.kind === "hashtags") libraryOf(item.clientId).hashtagSets.push(entry);
    else libraryOf(item.clientId).templates.push(entry);
  }
  return libraries;
}

// Listes paramétrables utilisées par le formulaire de publication
// (2026-09-18) : catégories de publication et types de tâche (pour
// "Demander une création").
export async function loadSocialFormLists() {
  const [categories, taskTypes] = await Promise.all([
    db.dropdownItem.findMany({
      where: { list: { key: SOCIAL_CATEGORY_LIST_KEY } },
      select: { id: true, label: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.dropdownItem.findMany({
      where: { list: { key: TASK_TYPE_LIST_KEY } },
      select: { slug: true, label: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return { categories, taskTypes };
}
