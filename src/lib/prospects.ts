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
