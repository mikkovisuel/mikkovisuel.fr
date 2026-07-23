import type { Prisma } from "@/generated/prisma/client";

// Même logique que `EXCLUDE_DEMO_CLIENT_TASKS` (src/lib/tasks.ts), mais pour
// les requêtes qui listent des clients plutôt que des tâches : le client de
// démo (`Client.isDemo`) est un outil interne (espace public de démo pour
// les prospects), pas un vrai client, donc à exclure des listes/sélecteurs
// de client courants de l'admin. Reste géré normalement depuis sa propre
// fiche (`/admin/clients/[clientId]`, qui ne l'utilise pas). Pour revenir en
// arrière, retirer ce filtre des requêtes qui l'utilisent (grep
// `EXCLUDE_DEMO_CLIENT`).
export const EXCLUDE_DEMO_CLIENT = {
  isDemo: false,
} satisfies Prisma.ClientWhereInput;

// Tri de la vue `/admin/clients` — voir `ClientSortControl`.
export type ClientSortField = "nom" | "date_ajout";
export type ClientSortDir = "asc" | "desc";

export function isClientSortField(value: string | undefined): value is ClientSortField {
  return value === "nom" || value === "date_ajout";
}

export function buildClientOrderBy(field: ClientSortField, dir: ClientSortDir) {
  return field === "nom" ? { name: dir } : { createdAt: dir };
}
