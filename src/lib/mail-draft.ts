import { taskDateFormatterShort } from "@/lib/tasks";

// Brouillons `mailto:` — complément manuel de l'envoi automatique par Resend
// (`sendDocumentByEmail` / `sendDeliverablesByEmail`), pas son remplacement.
// L'intérêt : le mail part de la vraie boîte de l'admin, se retrouve dans ses
// "Envoyés", et le client répond directement à une adresse humaine plutôt
// qu'à no-reply@.
//
// Contrainte structurante : `mailto:` ne peut pas porter de pièce jointe
// (limite du protocole, RFC 6068 — aucun contournement côté navigateur). Les
// brouillons renvoient donc vers l'espace client, où le destinataire retrouve
// le fichier après connexion. C'est volontairement un lien authentifié et non
// un lien de téléchargement public : les documents et livrables sont des
// données client, un lien public dans un corps de mail circulerait sans
// contrôle.
//
// Aucun de ces brouillons ne marque `sentAt` / `deliverablesSentAt` : on ne
// peut pas savoir si l'admin a réellement cliqué sur "Envoyer" dans son
// client mail. Ces indicateurs restent réservés à l'envoi Resend, qui, lui,
// est constaté.

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function buildMailtoUrl({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  // `URLSearchParams` encode l'espace en "+", que les clients mail affichent
  // littéralement dans l'objet et le corps d'un `mailto:` — d'où la
  // repasse en %20.
  const query = new URLSearchParams({ subject, body }).toString().replace(/\+/g, "%20");
  return `mailto:${to}?${query}`;
}

// Les sauts de ligne sont en CRLF : c'est ce qu'attend la RFC 6068 pour le
// champ `body`, et `URLSearchParams` les encode en %0D%0A.
function formatBody(lines: string[]) {
  return lines.join("\r\n");
}

// Les titres de tâche et noms de fichiers saisis par l'admin contiennent
// parfois déjà des guillemets ("Aftermovie « Nuit Blanche »") — les encadrer
// à nouveau produirait « Aftermovie « Nuit Blanche » ». Dans ce cas on laisse
// la valeur telle quelle.
function quote(value: string) {
  return /[«»"]/.test(value) ? value : `« ${value} »`;
}

export function buildDocumentMailDraft({
  to,
  fileName,
}: {
  to: string;
  fileName: string;
}) {
  return buildMailtoUrl({
    to,
    subject: fileName,
    body: formatBody([
      "Bonjour,",
      "",
      `Vous trouverez le document ${quote(fileName)} dans votre espace client :`,
      `${siteUrl()}/espace-client/administratif`,
      "",
      "Je reste à disposition pour tout renseignement complémentaire.",
      "",
      "Par avance, merci.",
    ]),
  });
}

export function buildDeliverablesMailDraft({
  to,
  taskTitle,
  eventDate,
}: {
  to: string;
  taskTitle: string;
  eventDate: Date | null;
}) {
  // Même objet que l'envoi Resend (voir `sendDeliverablesByEmail`), pour que
  // les deux chemins d'envoi soient indiscernables côté destinataire.
  const subject = eventDate
    ? `${taskDateFormatterShort.format(eventDate)} - ${taskTitle}`
    : taskTitle;

  return buildMailtoUrl({
    to,
    subject,
    body: formatBody([
      "Bonjour,",
      "",
      `Les livrables finaux de ${quote(taskTitle)} sont disponibles dans votre espace client :`,
      `${siteUrl()}/espace-client/livrables`,
      "",
      "Je reste à disposition pour tout renseignement complémentaire.",
      "",
      "Par avance, merci.",
    ]),
  });
}
