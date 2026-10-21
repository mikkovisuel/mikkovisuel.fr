// Dossiers de l'onglet Mail (2026-10-21) : nom dans l'adresse → libellé Gmail.
export const MAIL_FOLDERS = [
  { key: "reception", label: "Boîte de réception", labelId: "INBOX" },
  { key: "suivis", label: "Suivis", labelId: "STARRED" },
  { key: "importants", label: "Importants", labelId: "IMPORTANT" },
  { key: "envoyes", label: "Envoyés", labelId: "SENT" },
  { key: "brouillons", label: "Brouillons", labelId: "DRAFT" },
  { key: "tous", label: "Tous les messages", labelId: undefined },
  { key: "spam", label: "Spam", labelId: "SPAM" },
  { key: "corbeille", label: "Corbeille", labelId: "TRASH" },
] as const;

/** Décode les entités HTML des extraits Gmail (« &#39; », « &amp; »…). */
export function decodeEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
