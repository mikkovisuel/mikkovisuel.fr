// Règle d'accès d'un client à un fichier (téléchargements /api/fichiers/*,
// avatar) : le fichier appartient à son espace et n'est pas caché (tâche
// interne, publication encore en brouillon). L'admin, lui, voit tout.
// Testée dans tests/rules.test.ts.
export function clientOwnsFile(
  clientUser: { clientId: string } | null,
  file: { clientId: string; hidden?: boolean },
): boolean {
  return clientUser !== null && clientUser.clientId === file.clientId && !file.hidden;
}
