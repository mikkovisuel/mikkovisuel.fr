import { escapeHtml } from "@/lib/html-escape";

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
// le résultat séparément ci-dessous).
export function fillEmailTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

// Corps HTML d'un email de facturation à partir de son modèle (personnalisé
// depuis /admin/reglages, ou texte fixe par défaut) : le modèle lui-même
// est échappé avant de recevoir les placeholders (un admin qui tape "<" par
// erreur ne doit pas casser le HTML de l'email), puis les sauts de ligne
// deviennent des <br> — un `<textarea>` reste la façon la plus simple de
// rédiger plusieurs paragraphes. `escapeHtml` (src/lib/html-escape.ts) n'a
// pas de garde `server-only`, donc importable ici sans risque : cette
// fonction sert à l'identique côté serveur (envoi réel, payments.ts) et
// côté client (aperçu avant envoi, send-document-dialog.tsx — 2026-09-08,
// "avant chaque envoi, il faut une validation : contenu du mail (aperçu)"),
// pour que les deux correspondent toujours exactement.
export function renderInvoiceEmailBody(template: string, vars: Record<string, string>): string {
  // `\r\n` : un `<textarea>` soumet des fins de ligne CRLF, pas `\n` seul —
  // normalisé avant de convertir en `<br>`, sinon un `\r` isolé traîne juste
  // avant chaque `<br>` (inoffensif à l'affichage, mais un HTML plus propre
  // ne coûte rien).
  const normalized = template.replace(/\r\n/g, "\n");
  const filled = fillEmailTemplate(escapeHtml(normalized), vars);
  return `<p>${filled.replace(/\n/g, "<br>")}</p>`;
}

// Relance automatique des factures impayées (2026-10-20), J+7 puis J+15 après
// l'échéance. Texte proposé, modifiable dans Réglages ; la relance reste
// coupée tant que l'admin ne l'a pas activée. Variables : {fichier},
// {montant} (« , 680,00 € » ou vide), {echeance} (date), {jours} (jours de
// retard).
export const DEFAULT_INVOICE_AUTO_REMINDER_SUBJECT = "Rappel : facture {fichier} en attente de règlement";
export const DEFAULT_INVOICE_AUTO_REMINDER_BODY =
  "Bonjour,\n\nSauf erreur de ma part, la facture {fichier}{montant}, arrivée à échéance le {echeance}, n'a pas encore été réglée.\n\nVous la retrouverez dans votre espace client, rubrique Administratif, avec les moyens de paiement disponibles.\n\nSi le règlement est déjà parti, merci de ne pas tenir compte de ce message.\n\nBien cordialement,\nMikko Visuel";
