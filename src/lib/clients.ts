// Tri de la vue `/admin/clients` — voir `ClientSortControl`.
export type ClientSortField = "nom" | "date_ajout";
export type ClientSortDir = "asc" | "desc";

export function isClientSortField(value: string | undefined): value is ClientSortField {
  return value === "nom" || value === "date_ajout";
}

export function buildClientOrderBy(field: ClientSortField, dir: ClientSortDir) {
  return field === "nom" ? { name: dir } : { createdAt: dir };
}
