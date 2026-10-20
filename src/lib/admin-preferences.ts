// Profil d'affichage d'un admin (2026-10-20), stocké dans `Admin.preferences`
// (JSON). Point d'entrée unique : tout réglage lu par l'interface passe par
// `parseAdminPreferences`, qui ignore une valeur inconnue ou abîmée et
// retombe sur le défaut — une préférence corrompue ne doit jamais casser
// l'admin.
//
// Pour l'instant : la densité des listes. La personnalisation complète
// (couleur, rubriques, colonnes, vues par défaut) viendra s'ajouter ici.

export const DENSITIES = ["compact", "standard", "confortable"] as const;
export type Density = (typeof DENSITIES)[number];

/** Libellés et hauteur de ligne, comme le réglage « Densité » de Gmail. */
export const DENSITY_OPTIONS: { value: Density; label: string; rowHeight: number }[] = [
  { value: "compact", label: "Compacte", rowHeight: 32 },
  { value: "standard", label: "Par défaut", rowHeight: 40 },
  { value: "confortable", label: "Confortable", rowHeight: 48 },
];

export interface AdminPreferences {
  density: Density;
}

/** Choix du client du 2026-10-20 : compact par défaut. */
export const DEFAULT_ADMIN_PREFERENCES: AdminPreferences = { density: "compact" };

export function isDensity(value: unknown): value is Density {
  return typeof value === "string" && (DENSITIES as readonly string[]).includes(value);
}

export function parseAdminPreferences(raw: unknown): AdminPreferences {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    density: isDensity(source.density) ? source.density : DEFAULT_ADMIN_PREFERENCES.density,
  };
}
