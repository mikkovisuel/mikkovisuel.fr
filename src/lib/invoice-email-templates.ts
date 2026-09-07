// Textes par défaut des deux emails de facturation réels (voir
// sendDocumentByEmail/sendPaymentReminder dans src/lib/actions/payments.ts)
// — partagés avec /admin/reglages, qui les affiche pré-remplis tant que
// l'admin n'a pas personnalisé (AppSettings.documentSentEmailSubject etc.,
// `null` = pas encore personnalisé). Demande du 2026-09-07 : "ajouter les
// options d'édition des mails envoyés pour les factures". Reprennent mot
// pour mot le texte fixe qui existait avant cette fonctionnalité, pour ne
// rien changer tant que personne n'a rien édité.
export const DEFAULT_DOCUMENT_SENT_SUBJECT = "{fichier}";
export const DEFAULT_DOCUMENT_SENT_BODY =
  'Bonjour,\n\nCi-joint un nouveau document : "{fichier}".\n\nJe reste à disposition pour tout renseignement complémentaire.\n\nPar avance, merci.';
export const DEFAULT_PAYMENT_REMINDER_SUBJECT = "Rappel de paiement — {fichier}";
export const DEFAULT_PAYMENT_REMINDER_BODY =
  "Un document ({fichier}{montant}) est toujours en attente de paiement dans votre espace client.";

// Placeholders `{nom}` remplacés tels quels (pas de HTML ici : sert aussi
// bien au sujet — texte brut — qu'au corps, où l'appelant échappe/emballe
// le résultat séparément, voir `payments.ts`).
export function fillEmailTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}
