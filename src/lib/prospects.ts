import { FRENCH_REGIONS, guessRegionSlug } from "@/lib/france-regions";

// Petits utilitaires de date pour la prospection — factorisés hors des
// composants (voir isTaskOverdue dans src/lib/tasks.ts) car la règle ESLint
// react-hooks/purity interdit d'appeler `Date.now()`/`new Date()` en ligne
// dans le corps d'un composant.

export function isProspectReminderOverdue(prospect: { nextReminderAt: Date | null }) {
  return prospect.nextReminderAt !== null && prospect.nextReminderAt.getTime() < Date.now();
}

export function suggestedProspectReminderDate(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export interface RegionStatusCount {
  slug: string;
  label: string;
  color: string;
  count: number;
}

export interface RegionStat {
  slug: string;
  label: string;
  total: number;
  byStatus: RegionStatusCount[];
}

// Agrège les prospects par région (devinée depuis `city`, voir
// src/lib/france-regions.ts) pour la carte de France de /admin/prospection.
// Toujours calculé sur l'ensemble des prospects, pas la liste filtrée
// affichée en dessous — la carte reste une vue d'ensemble stable, pas
// dépendante du filtre statut/recherche du moment.
export function buildRegionStats(
  prospects: { city: string | null; status: { slug: string; label: string; color: string } }[],
): RegionStat[] {
  const byRegion = new Map<string, Map<string, RegionStatusCount>>();

  for (const prospect of prospects) {
    const regionSlug = guessRegionSlug(prospect.city);
    if (!regionSlug) continue;

    const byStatus = byRegion.get(regionSlug) ?? new Map<string, RegionStatusCount>();
    const entry = byStatus.get(prospect.status.slug) ?? {
      slug: prospect.status.slug,
      label: prospect.status.label,
      color: prospect.status.color,
      count: 0,
    };
    entry.count += 1;
    byStatus.set(prospect.status.slug, entry);
    byRegion.set(regionSlug, byStatus);
  }

  return FRENCH_REGIONS.map((region) => {
    const byStatus = [...(byRegion.get(region.slug)?.values() ?? [])].sort((a, b) => b.count - a.count);
    return {
      ...region,
      total: byStatus.reduce((sum, entry) => sum + entry.count, 0),
      byStatus,
    };
  });
}
